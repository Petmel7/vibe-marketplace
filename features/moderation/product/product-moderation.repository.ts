import { prisma } from '@/lib/prisma'
import type { Product, ProductStatus, Store } from '@/app/generated/prisma/client'
import type { ProductModerationFilters } from './product-moderation.dto'

type ProductWithStore = Product & { store: Store }

const STORE_INCLUDE = { store: true } as const

export async function findPendingProductApprovals(
  filters: ProductModerationFilters,
): Promise<{ items: ProductWithStore[]; total: number }> {
  const { page, limit } = filters
  const where = { status: 'PENDING_REVIEW' as ProductStatus }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: STORE_INCLUDE,
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return { items, total }
}

export async function findRejectedProducts(
  filters: ProductModerationFilters,
): Promise<{ items: ProductWithStore[]; total: number }> {
  const { page, limit } = filters
  const where = { status: 'REJECTED' as ProductStatus }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: STORE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return { items, total }
}

export async function findArchivedProducts(
  filters: ProductModerationFilters,
): Promise<{ items: ProductWithStore[]; total: number }> {
  const { page, limit } = filters
  const where = { status: 'ARCHIVED' as ProductStatus }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: STORE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return { items, total }
}

export async function findAllProductsMod(
  filters: ProductModerationFilters,
): Promise<{ items: ProductWithStore[]; total: number }> {
  const { page, limit } = filters

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      include: STORE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count(),
  ])

  return { items, total }
}

export async function findProductByIdWithStore(id: string): Promise<ProductWithStore | null> {
  return prisma.product.findUnique({
    where: { id },
    include: STORE_INCLUDE,
  })
}

export async function updateProductModerationStatus(
  id: string,
  status: ProductStatus,
  adminId: string,
  reason?: string,
): Promise<ProductWithStore> {
  return prisma.product.update({
    where: { id },
    data: {
      status,
      moderationReason: reason ?? null,
      moderatedAt: new Date(),
      moderatedBy: adminId,
      updatedAt: new Date(),
      // Set publishedAt when first approved
      ...(status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
    },
    include: STORE_INCLUDE,
  })
}
