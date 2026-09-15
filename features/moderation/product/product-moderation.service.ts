import { ProductNotFoundError } from '@/lib/errors/seller'
import { InvalidModerationTransitionError } from '@/lib/errors/admin'
import { assertAdminAccess } from '@/lib/auth/adminGuards'
import type { SessionUser } from '@/features/auth/auth.dto'
import type {
  ProductModerationDto,
  ProductModerationDetailDto,
  ProductModerationQueueDto,
  ProductModerationFilters,
} from './product-moderation.dto'
import {
  findPendingProductApprovals,
  findRejectedProducts,
  findProductByIdWithStore,
  findProductModerationDetailById,
  updateProductModerationStatus,
} from './product-moderation.repository'
import type { ProductModerationDetailRecord } from './product-moderation.repository'
import type { Product, Store } from '@/app/generated/prisma/client'
import { syncSystemNewBadgeForProduct } from '@/features/products/product-badge.service'
import { scheduleProductMetricsRecalculation } from '@/features/products/product-metrics.jobs'
import {
  emitProductApprovedEmailEvent,
  emitProductRejectedEmailEvent,
} from '@/features/email/events/email.events'
import {
  emitProductApprovedNotificationEvent,
  emitProductRejectedNotificationEvent,
} from '@/features/notifications/events/notification.events'
import { recordProductRejectedRiskSignal } from '@/features/risk/risk.service'
import { logError } from '@/utils/logger'

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
    rejectionReason: product.rejectionReason,
    publishedAt: product.publishedAt,
    moderatedAt: product.moderatedAt,
    moderatedBy: product.moderatedBy,
    createdAt: product.createdAt,
  }
}

function resolveModerationProductImageUrl(product: ProductModerationDetailRecord): string | null {
  const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0]
  return primaryImage?.url ?? product.imageUrl ?? null
}

function toProductModerationDetailDto(
  product: ProductModerationDetailRecord,
): ProductModerationDetailDto {
  return {
    id: product.id,
    name: product.name,
    storeId: product.storeId,
    storeName: product.store.name,
    status: product.status,
    moderationReason: product.moderationReason,
    rejectionReason: product.rejectionReason,
    publishedAt: product.publishedAt,
    moderatedAt: product.moderatedAt,
    moderatedBy: product.moderatedBy,
    createdAt: product.createdAt,
    description: product.description ?? null,
    price: product.price.toString(),
    imageUrl: resolveModerationProductImageUrl(product),
    sku: product.sku ?? null,
    categoryId: product.categoryId ?? null,
    categoryName: product.category?.name ?? null,
    categorySlug: product.category?.slug ?? null,
    storeSlug: product.store.slug,
    storeOwnerId: product.store.ownerId,
    storeOwnerEmail: product.store.owner.email ?? null,
    sellerBusinessName: product.store.sellerProfile?.businessName ?? null,
    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.altText ?? null,
      isPrimary: image.isPrimary,
      position: image.position,
    })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size ?? null,
      color: variant.color ?? null,
      price: variant.price != null ? variant.price.toString() : null,
      stock: variant.stock,
    })),
    updatedAt: product.updatedAt,
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

export async function getProductModerationDetail(
  admin: SessionUser,
  productId: string,
): Promise<ProductModerationDetailDto> {
  assertAdminAccess(admin)

  const product = await findProductModerationDetailById(productId)
  if (!product) throw new ProductNotFoundError()

  return toProductModerationDetailDto(product)
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
  scheduleProductMetricsRecalculation({
    reason: 'product-approved',
    dedupeKey: `product-metrics:product-approved:${updated.id}:${updated.updatedAt.toISOString()}`,
  })
  void emitProductApprovedEmailEvent({ productId: updated.id }).catch((error) => {
    logError('product-moderation:approve-email', error)
  })
  void emitProductApprovedNotificationEvent({ productId: updated.id }).catch((error) => {
    logError('product-moderation:approve-notification', error)
  })
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
  scheduleProductMetricsRecalculation({
    reason: 'product-rejected',
    dedupeKey: `product-metrics:product-rejected:${updated.id}:${updated.updatedAt.toISOString()}`,
  })
  void emitProductRejectedEmailEvent({ productId: updated.id, reason }).catch((error) => {
    logError('product-moderation:reject-email', error)
  })
  void emitProductRejectedNotificationEvent({ productId: updated.id, reason }).catch((error) => {
    logError('product-moderation:reject-notification', error)
  })
  void recordProductRejectedRiskSignal({
    productId: updated.id,
    ownerUserId: updated.store.ownerId,
    storeId: updated.store.id,
    reason,
  }).catch((error) => {
    logError('product-moderation:reject-risk-signal', error)
  })
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
  scheduleProductMetricsRecalculation({
    reason: 'product-archived',
    dedupeKey: `product-metrics:product-archived:${updated.id}:${updated.updatedAt.toISOString()}`,
  })
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
  scheduleProductMetricsRecalculation({
    reason: 'product-restored',
    dedupeKey: `product-metrics:product-restored:${updated.id}:${updated.updatedAt.toISOString()}`,
  })
  return toProductModerationDto(updated)
}
