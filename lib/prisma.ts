import { PrismaClient } from '@/app/generated/prisma/client'
import postgres from 'postgres'
import type { SqlDriverAdapterFactory } from '@prisma/client/runtime/client'

// ---------------------------------------------------------------------------
// Postgres.js → Prisma v7 driver adapter
//
// Prisma v7 uses the "client" engine type which requires a SqlDriverAdapter.
// No official @prisma/adapter-pg is installed, so we implement the interface
// directly on top of the `postgres` (v3) package.
// ---------------------------------------------------------------------------

// OID → Prisma ColumnTypeEnum numeric values
const PrismaColumnType = {
  Int32:    0,
  Int64:    1,
  Float:    2,
  Double:   3,
  Numeric:  4,
  Boolean:  5,
  Text:     7,
  Date:     8,
  DateTime: 10,
  Json:     11,
  Bytes:    13,
  Uuid:     15,
} as const

type PgColumn = { name: string; type: number }

function mapColumnType(pgOid: number): number {
  switch (pgOid) {
    case 16:   return PrismaColumnType.Boolean
    case 17:   return PrismaColumnType.Bytes
    case 20:   return PrismaColumnType.Int64
    case 21:   return PrismaColumnType.Int32
    case 23:   return PrismaColumnType.Int32
    case 25:   return PrismaColumnType.Text
    case 114:  return PrismaColumnType.Json
    case 700:  return PrismaColumnType.Float
    case 701:  return PrismaColumnType.Double
    case 1043: return PrismaColumnType.Text
    case 1082: return PrismaColumnType.Date
    case 1114: return PrismaColumnType.DateTime
    case 1184: return PrismaColumnType.DateTime
    case 1700: return PrismaColumnType.Numeric
    case 2950: return PrismaColumnType.Uuid
    case 3802: return PrismaColumnType.Json
    default:   return PrismaColumnType.Text
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

// ---------------------------------------------------------------------------
// Query helpers shared by both the adapter and transaction objects
// ---------------------------------------------------------------------------

type SqlLike = Pick<postgres.Sql, 'unsafe'>

async function execQueryRaw(sql: SqlLike, query: { sql: string; args: unknown[] }) {
  const rows = await sql.unsafe(
    query.sql,
    query.args as Parameters<typeof sql.unsafe>[1]
  )
  return buildResultSet(rows as unknown as postgres.RowList<PostgresRow[]>)
}

async function execExecuteRaw(sql: SqlLike, query: { sql: string; args: unknown[] }) {
  const result = await sql.unsafe(
    query.sql,
    query.args as Parameters<typeof sql.unsafe>[1]
  )
  return (result as unknown as { count?: number }).count ?? 0
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

function buildTransactionObject(reserved: postgres.ReservedSql) {
  return {
    provider: 'postgres' as const,
    adapterName: '@local/adapter-postgres' as const,
    options: { usePhantomQuery: false },

    async queryRaw(query: { sql: string; args: unknown[] }) {
      return execQueryRaw(reserved, query)
    },

    async executeRaw(query: { sql: string; args: unknown[] }) {
      return execExecuteRaw(reserved, query)
    },

    async commit(): Promise<void> {
      try {
        await reserved.unsafe('COMMIT')
      } finally {
        reserved.release()
      }
    },

    async rollback(): Promise<void> {
      try {
        await reserved.unsafe('ROLLBACK')
      } finally {
        reserved.release()
      }
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
      return execQueryRaw(sql, query)
    },

    async executeRaw(query: { sql: string; args: unknown[] }) {
      return execExecuteRaw(sql, query)
    },

    async executeScript(script: string): Promise<void> {
      await sql.unsafe(script)
    },

    async startTransaction(isolationLevel?: IsolationLevel) {
      const reserved = await sql.reserve()

      // SNAPSHOT is SQL Server-only; fall back to default for Postgres.
      const level = isolationLevel && isolationLevel !== 'SNAPSHOT'
        ? isolationLevel
        : null
      const beginSql = level ? `BEGIN ISOLATION LEVEL ${level}` : 'BEGIN'

      try {
        await reserved.unsafe(beginSql)
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
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const sql = postgres(connectionString, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
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
