import { PrismaClient } from '@/app/generated/prisma/client'
import postgres from 'postgres'
import type { SqlDriverAdapterFactory } from '@prisma/client/runtime/client'
import { getServerEnv } from '@/config/env'
import { DatabaseUnavailableError } from '@/lib/errors/database'
import { logError, logInfo, logWarn } from '@/utils/logger'

// ---------------------------------------------------------------------------
// Postgres.js -> Prisma v7 driver adapter
//
// Prisma v7 uses the "client" engine type which requires a SqlDriverAdapter.
// No official @prisma/adapter-pg is installed, so we implement the interface
// directly on top of the `postgres` (v3) package.
// ---------------------------------------------------------------------------

// OID -> Prisma ColumnTypeEnum numeric values
const PrismaColumnType = {
  Int32: 0,
  Int64: 1,
  Float: 2,
  Double: 3,
  Numeric: 4,
  Boolean: 5,
  Text: 7,
  Date: 8,
  DateTime: 10,
  Json: 11,
  Bytes: 13,
  Uuid: 15,
} as const

const PRISMA_QUERY_TIMEOUT_MS = 8_000
const PRISMA_SLOW_QUERY_MS = 1_000

type PgColumn = { name: string; type: number }

function mapColumnType(pgOid: number): number {
  switch (pgOid) {
    case 16:
      return PrismaColumnType.Boolean
    case 17:
      return PrismaColumnType.Bytes
    case 20:
      return PrismaColumnType.Int64
    case 21:
      return PrismaColumnType.Int32
    case 23:
      return PrismaColumnType.Int32
    case 25:
      return PrismaColumnType.Text
    case 114:
      return PrismaColumnType.Json
    case 700:
      return PrismaColumnType.Float
    case 701:
      return PrismaColumnType.Double
    case 1043:
      return PrismaColumnType.Text
    case 1082:
      return PrismaColumnType.Date
    case 1114:
      return PrismaColumnType.DateTime
    case 1184:
      return PrismaColumnType.DateTime
    case 1700:
      return PrismaColumnType.Numeric
    case 2950:
      return PrismaColumnType.Uuid
    case 3802:
      return PrismaColumnType.Json
    default:
      return PrismaColumnType.Text
  }
}

type PostgresRow = Record<string, unknown>

function buildResultSet(rows: postgres.RowList<PostgresRow[]>) {
  const columns = (rows as unknown as { columns?: PgColumn[] }).columns ?? []
  const columnNames = columns.map((c) => c.name)
  const columnTypes = columns.map((c) => mapColumnType(c.type))
  const mapped = (rows as unknown as PostgresRow[]).map((row) =>
    columnNames.map((col) => row[col] ?? null)
  )
  return { columnNames, columnTypes, rows: mapped }
}

function getPrismaPoolMax() {
  const isNextProductionBuild =
    process.env.NEXT_PHASE === 'phase-production-build'

  // Supabase Transaction Pooler is session-constrained, but a single session
  // lets one interactive transaction starve every unrelated read in the same
  // process. Keep the pool small while allowing one reserved transaction and
  // one concurrent read to proceed independently.
  if (isNextProductionBuild || process.env.NODE_ENV === 'production') {
    return 2
  }

  return 3
}

function redactSqlPreview(sql: string) {
  return sql.replace(/\s+/g, ' ').trim().slice(0, 240)
}

function getDurationMs(startedAt: bigint) {
  return Number(process.hrtime.bigint() - startedAt) / 1_000_000
}

async function withDatabaseTimeout<T>(
  operation: string,
  context: Record<string, unknown>,
  run: () => Promise<T>
): Promise<T> {
  const startedAt = process.hrtime.bigint()

  logInfo('prisma:before', {
    domain: 'database',
    operation,
    ...context,
  })

  let settled = false
  const slowTimer = setTimeout(() => {
    logWarn('prisma:slow', {
      domain: 'database',
      operation,
      durationMs: Number(getDurationMs(startedAt).toFixed(1)),
      ...context,
    })
  }, PRISMA_SLOW_QUERY_MS)

  let timeoutReject: ((reason?: unknown) => void) | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutReject = reject
  })

  const timeoutTimer = setTimeout(() => {
    if (settled) {
      return
    }

    logError(
      'prisma:timeout',
      new DatabaseUnavailableError(),
      {
        domain: 'database',
        operation,
        timeoutMs: PRISMA_QUERY_TIMEOUT_MS,
        durationMs: Number(getDurationMs(startedAt).toFixed(1)),
        ...context,
      }
    )

    settled = true
    timeoutReject?.(
      new DatabaseUnavailableError(
        'Database query timed out. Please try again.'
      )
    )
  }, PRISMA_QUERY_TIMEOUT_MS)

  try {
    const result = await Promise.race([run(), timeoutPromise])
    settled = true
    logInfo('prisma:after', {
      domain: 'database',
      operation,
      durationMs: Number(getDurationMs(startedAt).toFixed(1)),
      ...context,
    })
    return result
  } catch (error) {
    settled = true
    logError('prisma:error', error, {
      domain: 'database',
      operation,
      durationMs: Number(getDurationMs(startedAt).toFixed(1)),
      ...context,
    })
    throw error
  } finally {
    clearTimeout(slowTimer)
    clearTimeout(timeoutTimer)
  }
}

// ---------------------------------------------------------------------------
// Query helpers shared by both the adapter and transaction objects
// ---------------------------------------------------------------------------

type SqlLike = Pick<postgres.Sql, 'unsafe'>

async function execQueryRaw(
  sql: SqlLike,
  query: { sql: string; args: unknown[] },
  context: Record<string, unknown>
) {
  const rows = await withDatabaseTimeout(
    'queryRaw',
    {
      sqlPreview: redactSqlPreview(query.sql),
      argsCount: query.args.length,
      ...context,
    },
    () =>
      sql.unsafe(
        query.sql,
        query.args as Parameters<typeof sql.unsafe>[1]
      ) as Promise<postgres.RowList<PostgresRow[]>>
  )

  return buildResultSet(rows)
}

async function execExecuteRaw(
  sql: SqlLike,
  query: { sql: string; args: unknown[] },
  context: Record<string, unknown>
) {
  const result = await withDatabaseTimeout(
    'executeRaw',
    {
      sqlPreview: redactSqlPreview(query.sql),
      argsCount: query.args.length,
      ...context,
    },
    () =>
      sql.unsafe(
        query.sql,
        query.args as Parameters<typeof sql.unsafe>[1]
      ) as Promise<{ count?: number }>
  )

  return result.count ?? 0
}

// ---------------------------------------------------------------------------
// Transaction implementation using a reserved connection
// ---------------------------------------------------------------------------

type IsolationLevel =
  | 'READ UNCOMMITTED'
  | 'READ COMMITTED'
  | 'REPEATABLE READ'
  | 'SNAPSHOT'
  | 'SERIALIZABLE'

function normalizeTransactionControlSql(sql: string) {
  return sql.trim().replace(/;+$/, '').toUpperCase()
}

function buildTransactionObject(reserved: postgres.ReservedSql) {
  const transactionContext = {
    transaction: true,
  }

  let finalized: 'commit' | 'rollback' | null = null
  let released = false

  const releaseReserved = () => {
    if (released) {
      return
    }

    reserved.release()
    released = true
    logInfo('prisma:transaction:release', {
      domain: 'database',
      ...transactionContext,
      finalized,
    })
  }

  const finalizeTransaction = async (
    action: 'commit' | 'rollback',
    source: 'executeRaw' | 'queryRaw' | 'hook',
  ) => {
    if (finalized) {
      logInfo('prisma:transaction:finalize-skip', {
        domain: 'database',
        action,
        source,
        finalized,
        ...transactionContext,
      })
      releaseReserved()
      return
    }

    finalized = action

    try {
      await withDatabaseTimeout(
        `transaction.${action}`,
        {
          ...transactionContext,
          source,
        },
        () =>
          reserved.unsafe(action === 'commit' ? 'COMMIT' : 'ROLLBACK') as Promise<unknown>
      )
    } finally {
      releaseReserved()
    }
  }

  return {
    provider: 'postgres' as const,
    adapterName: '@local/adapter-postgres' as const,
    options: { usePhantomQuery: false },

    async queryRaw(query: { sql: string; args: unknown[] }) {
      const normalizedSql = normalizeTransactionControlSql(query.sql)

      if (normalizedSql === 'COMMIT') {
        await finalizeTransaction('commit', 'queryRaw')
        return {
          columnNames: [],
          columnTypes: [],
          rows: [],
        }
      }

      if (normalizedSql === 'ROLLBACK') {
        await finalizeTransaction('rollback', 'queryRaw')
        return {
          columnNames: [],
          columnTypes: [],
          rows: [],
        }
      }

      return execQueryRaw(reserved, query, transactionContext)
    },

    async executeRaw(query: { sql: string; args: unknown[] }) {
      const normalizedSql = normalizeTransactionControlSql(query.sql)

      if (normalizedSql === 'COMMIT') {
        await finalizeTransaction('commit', 'executeRaw')
        return 0
      }

      if (normalizedSql === 'ROLLBACK') {
        await finalizeTransaction('rollback', 'executeRaw')
        return 0
      }

      return execExecuteRaw(reserved, query, transactionContext)
    },

    async commit(): Promise<void> {
      await finalizeTransaction('commit', 'hook')
    },

    async rollback(): Promise<void> {
      await finalizeTransaction('rollback', 'hook')
    },
  }
}

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

function createAdapter(sql: postgres.Sql): SqlDriverAdapterFactory {
  const adapterImpl = {
    provider: 'postgres' as const,
    adapterName: '@local/adapter-postgres' as const,

    async queryRaw(query: { sql: string; args: unknown[] }) {
      return execQueryRaw(sql, query, { transaction: false })
    },

    async executeRaw(query: { sql: string; args: unknown[] }) {
      return execExecuteRaw(sql, query, { transaction: false })
    },

    async executeScript(script: string): Promise<void> {
      await withDatabaseTimeout(
        'executeScript',
        {
          sqlPreview: redactSqlPreview(script),
          transaction: false,
        },
        () => sql.unsafe(script) as Promise<unknown>
      )
    },

    async startTransaction(isolationLevel?: IsolationLevel) {
      const reserved = await withDatabaseTimeout(
        'transaction.reserve',
        { transaction: true },
        () => sql.reserve()
      )

      // SNAPSHOT is SQL Server-only; fall back to default for Postgres.
      const level =
        isolationLevel && isolationLevel !== 'SNAPSHOT'
          ? isolationLevel
          : null
      const beginSql = level ? `BEGIN ISOLATION LEVEL ${level}` : 'BEGIN'

      try {
        await withDatabaseTimeout(
          'transaction.begin',
          {
            transaction: true,
            isolationLevel: level ?? 'default',
          },
          () => reserved.unsafe(beginSql) as Promise<unknown>
        )
      } catch (err) {
        reserved.release()
        throw err
      }

      return buildTransactionObject(reserved)
    },

    async dispose(): Promise<void> {
      await sql.end()
    },
  }

  return {
    provider: 'postgres' as const,
    adapterName: '@local/adapter-postgres' as const,
    async connect() {
      return adapterImpl as unknown as Awaited<
        ReturnType<SqlDriverAdapterFactory['connect']>
      >
    },
  }
}

// ---------------------------------------------------------------------------
// Singleton PrismaClient
// ---------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const { DATABASE_URL: connectionString } = getServerEnv()
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const sql = postgres(connectionString, {
    max: getPrismaPoolMax(),
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 5,
    prepare: false,
    connection: {
      application_name: 'vibe-marketplace-prisma',
      statement_timeout: PRISMA_QUERY_TIMEOUT_MS,
      lock_timeout: 5_000,
      idle_in_transaction_session_timeout: 10_000,
    },
  })

  return new PrismaClient({
    adapter: createAdapter(sql),
  } as ConstructorParameters<typeof PrismaClient>[0])
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
