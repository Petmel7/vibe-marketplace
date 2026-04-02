import { PrismaClient } from '@/app/generated/prisma/client'
import postgres from 'postgres'
import type { SqlDriverAdapterFactory } from '@prisma/client/runtime/client'

// ---------------------------------------------------------------------------
// Postgres.js → Prisma v7 driver adapter
//
// Prisma v7 dropped the embedded query engine and now requires a driver
// adapter that implements SqlDriverAdapterFactory. No official
// @prisma/adapter-pg package is installed in this project, so we implement
// the minimal interface directly on top of the `postgres` (v3) package.
//
// Column-type mapping follows the convention used by the official adapters:
//   https://github.com/prisma/prisma/tree/main/packages/adapter-pg
// ---------------------------------------------------------------------------

// OID → Prisma ColumnTypeEnum numeric values (not re-imported from the module
// since ColumnTypeEnum is declared but not exported from the runtime client).
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
    case 16:   return PrismaColumnType.Boolean   // bool
    case 17:   return PrismaColumnType.Bytes     // bytea
    case 20:   return PrismaColumnType.Int64     // int8
    case 21:   return PrismaColumnType.Int32     // int2
    case 23:   return PrismaColumnType.Int32     // int4
    case 25:   return PrismaColumnType.Text      // text
    case 114:  return PrismaColumnType.Json      // json
    case 700:  return PrismaColumnType.Float     // float4
    case 701:  return PrismaColumnType.Double    // float8
    case 1043: return PrismaColumnType.Text      // varchar
    case 1082: return PrismaColumnType.Date      // date
    case 1114: return PrismaColumnType.DateTime  // timestamp
    case 1184: return PrismaColumnType.DateTime  // timestamptz
    case 1700: return PrismaColumnType.Numeric   // numeric / decimal
    case 2950: return PrismaColumnType.Uuid      // uuid
    case 3802: return PrismaColumnType.Json      // jsonb
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

function createAdapter(sql: postgres.Sql): SqlDriverAdapterFactory {
  // Build a single SqlDriverAdapter-compatible object.
  const adapterImpl = {
    provider: 'postgres' as const,
    adapterName: '@local/adapter-postgres' as const,

    async queryRaw(query: { sql: string; args: unknown[] }) {
      const rows = await sql.unsafe(
        query.sql,
        query.args as Parameters<typeof sql.unsafe>[1]
      )
      return buildResultSet(rows as unknown as postgres.RowList<PostgresRow[]>)
    },

    async executeRaw(query: { sql: string; args: unknown[] }) {
      const result = await sql.unsafe(
        query.sql,
        query.args as Parameters<typeof sql.unsafe>[1]
      )
      return (result as unknown as { count?: number }).count ?? 0
    },

    async executeScript(script: string): Promise<void> {
      await sql.unsafe(script)
    },

    startTransaction(): never {
      throw new Error(
        'Transactions not implemented in the minimal postgres adapter'
      )
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
//
// In Next.js development mode the module cache is cleared on hot-reload,
// causing multiple PrismaClient instances. We attach the singleton to the
// global object to prevent that (standard Next.js + Prisma pattern).
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
