import type { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'

export type RepositoryTransactionClient = Prisma.TransactionClient
export type RepositoryClient = typeof prisma | RepositoryTransactionClient

export type RepositoryContext = {
  db?: RepositoryClient
}

export function resolveRepositoryClient(context?: RepositoryContext): RepositoryClient {
  return context?.db ?? prisma
}

/**
 * Opens a Prisma transaction for service-layer orchestration.
 *
 * Repositories should accept the provided transaction client through
 * RepositoryContext instead of opening transactions themselves.
 */
export function runServiceTransaction<T>(
  callback: (tx: RepositoryTransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(callback)
}
