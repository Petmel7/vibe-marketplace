import { ProductNotFoundError } from '@/lib/errors/seller'
import { InvalidModerationTransitionError } from '@/lib/errors/admin'
import { assertAdminAccess } from '@/lib/auth/adminGuards'
import type { SessionUser } from '@/features/auth/auth.dto'
import type {
  ProductModerationDto,
  ProductModerationQueueDto,
  ProductModerationFilters,
} from './product-moderation.dto'
import {
  findPendingProductApprovals,
  findRejectedProducts,
  findProductByIdWithStore,
  updateProductModerationStatus,
} from './product-moderation.repository'
import type { Product, Store } from '@/app/generated/prisma/client'
import { syncSystemNewBadgeForProduct } from '@/features/products/product-badge.service'

// ---------------------------------------------------------------------------
// DTO mapper
// ---------------------------------------------------------------------------

function toProductModerationDto(product: Product & { store: Store }): ProductModerationDto {
  return {
    id: product.id,
    name: product.name,
    storeId: product.storeId,
    storeName: product.store.name,
    status: product.status,
    moderationReason: product.moderationReason,
    moderatedAt: product.moderatedAt,
    moderatedBy: product.moderatedBy,
    createdAt: product.createdAt,
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getPendingProductQueue(
  admin: SessionUser,
  filters: ProductModerationFilters,
): Promise<ProductModerationQueueDto> {
  assertAdminAccess(admin)
  const { items, total } = await findPendingProductApprovals(filters)
  return {
    items: items.map(toProductModerationDto),
    total,
    page: filters.page,
    limit: filters.limit,
  }
}

export async function getRejectedProducts(
  admin: SessionUser,
  filters: ProductModerationFilters,
): Promise<ProductModerationQueueDto> {
  assertAdminAccess(admin)
  const { items, total } = await findRejectedProducts(filters)
  return {
    items: items.map(toProductModerationDto),
    total,
    page: filters.page,
    limit: filters.limit,
  }
}

export async function approveProduct(
  admin: SessionUser,
  productId: string,
): Promise<ProductModerationDto> {
  assertAdminAccess(admin)

  const product = await findProductByIdWithStore(productId)
  if (!product) throw new ProductNotFoundError()

  if (product.status !== 'PENDING_REVIEW') {
    throw new InvalidModerationTransitionError(product.status, 'PUBLISHED')
  }

  // Pass publishedAt via the extra data handled in repository
  const updated = await updateProductModerationStatus(productId, 'PUBLISHED', admin.id)
  await syncSystemNewBadgeForProduct(updated)
  return toProductModerationDto(updated)
}

export async function rejectProduct(
  admin: SessionUser,
  productId: string,
  reason: string,
): Promise<ProductModerationDto> {
  assertAdminAccess(admin)

  const product = await findProductByIdWithStore(productId)
  if (!product) throw new ProductNotFoundError()

  if (product.status !== 'PENDING_REVIEW') {
    throw new InvalidModerationTransitionError(product.status, 'REJECTED')
  }

  const updated = await updateProductModerationStatus(productId, 'REJECTED', admin.id, reason)
  await syncSystemNewBadgeForProduct(updated)
  return toProductModerationDto(updated)
}

export async function archiveProduct(
  admin: SessionUser,
  productId: string,
  reason?: string,
): Promise<ProductModerationDto> {
  assertAdminAccess(admin)

  const product = await findProductByIdWithStore(productId)
  if (!product) throw new ProductNotFoundError()

  if (product.status !== 'PUBLISHED' && product.status !== 'REJECTED') {
    throw new InvalidModerationTransitionError(product.status, 'ARCHIVED')
  }

  const updated = await updateProductModerationStatus(productId, 'ARCHIVED', admin.id, reason)
  await syncSystemNewBadgeForProduct(updated)
  return toProductModerationDto(updated)
}

export async function restoreProduct(
  admin: SessionUser,
  productId: string,
): Promise<ProductModerationDto> {
  assertAdminAccess(admin)

  const product = await findProductByIdWithStore(productId)
  if (!product) throw new ProductNotFoundError()

  if (product.status !== 'ARCHIVED') {
    throw new InvalidModerationTransitionError(product.status, 'DRAFT')
  }

  const updated = await updateProductModerationStatus(productId, 'DRAFT', admin.id)
  await syncSystemNewBadgeForProduct(updated)
  return toProductModerationDto(updated)
}
