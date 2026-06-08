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
