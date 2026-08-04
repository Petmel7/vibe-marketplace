import { ConflictError, DatabaseError, NotFoundError, type AppError } from './app'

const PRISMA_ERROR_CODES = new Set(['P2002', 'P2003', 'P2025'])

type PrismaLikeError = {
  code?: unknown
  meta?: unknown
}

function getPrismaCode(error: unknown) {
  if (!error || typeof error !== 'object') {
    return null
  }

  const code = (error as PrismaLikeError).code

  return typeof code === 'string' && PRISMA_ERROR_CODES.has(code) ? code : null
}

/**
 * Maps known Prisma errors to safe public AppErrors.
 *
 * Services may still throw domain-specific errors before persistence, but Prisma
 * constraint/not-found failures should be centralized here instead of repeated
 * as raw `P2002`/`P2003`/`P2025` checks in route handlers.
 */
export function mapPrismaError(error: unknown): AppError | null {
  const code = getPrismaCode(error)

  if (code === 'P2002') {
    return new ConflictError('A record with this value already exists', 'UNIQUE_CONSTRAINT_VIOLATION', undefined, error)
  }

  if (code === 'P2003') {
    return new ConflictError('Related record constraint failed', 'FOREIGN_KEY_CONSTRAINT_VIOLATION', undefined, error)
  }

  if (code === 'P2025') {
    return new NotFoundError('Record not found', 'RECORD_NOT_FOUND', undefined, error)
  }

  if (code) {
    return new DatabaseError(undefined, 'DATABASE_ERROR', undefined, error)
  }

  return null
}
