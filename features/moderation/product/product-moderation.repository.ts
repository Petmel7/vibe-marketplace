import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma/client'
import type { Product, ProductStatus, Store } from '@/app/generated/prisma/client'
import type { ProductModerationFilters } from './product-moderation.dto'

type ProductWithStore = Product & { store: Store }

const STORE_INCLUDE = { store: true } as const

const PRODUCT_MODERATION_DETAIL_SELECT = {
  id: true,
  storeId: true,
  categoryId: true,
  name: true,
  description: true,
  price: true,
  imageUrl: true,
  isActive: true,
  sku: true,
  isHit: true,
  isNew: true,
  status: true,
  rejectionReason: true,
  publishedAt: true,
  moderationReason: true,
  moderatedAt: true,
  moderatedBy: true,
  createdAt: true,
  updatedAt: true,
  store: {
    select: {
      id: true,
      name: true,
      slug: true,
      ownerId: true,
      owner: {
        select: {
          email: true,
        },
      },
      sellerProfile: {
        select: {
          businessName: true,
        },
      },
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  images: {
    select: {
      id: true,
      url: true,
      altText: true,
      isPrimary: true,
      position: true,
      createdAt: true,
    },
    orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  },
  variants: {
    select: {
      id: true,
      sku: true,
      size: true,
      color: true,
      price: true,
      stock: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ProductSelect

export type ProductModerationDetailRecord = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_MODERATION_DETAIL_SELECT
}>

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

export async function findProductModerationDetailById(
  id: string,
): Promise<ProductModerationDetailRecord | null> {
  return prisma.product.findUnique({
    where: { id },
    select: PRODUCT_MODERATION_DETAIL_SELECT,
  })
}

export async function updateProductModerationStatus(
  id: string,
  status: ProductStatus,
  adminId: string,
  reason?: string,
): Promise<ProductWithStore> {
  const isRejected = status === 'REJECTED'
  const isPublished = status === 'PUBLISHED'

  return prisma.product.update({
    where: { id },
    data: {
      status,
      moderationReason: reason ?? null,
      rejectionReason: isRejected ? reason ?? null : null,
      moderatedAt: new Date(),
      moderatedBy: adminId,
      updatedAt: new Date(),
      // Set publishedAt when first approved
      ...(isPublished ? { publishedAt: new Date() } : {}),
    },
    include: STORE_INCLUDE,
  })
}
