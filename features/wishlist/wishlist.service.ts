import {
  findWishlistByUserId,
  createWishlist,
  ensureWishlistIdentity,
  addWishlistItemIdempotent,
  removeWishlistItemIdempotent,
  productExists,
} from '@/features/wishlist/wishlist.repository'
import type {
  WishlistDto,
  WishlistItemDto,
  WishlistToggleDto,
} from '@/features/wishlist/wishlist.dto'
import type { WishlistWithItems, WishlistItemWithProduct } from '@/features/wishlist/wishlist.repository'
import { scheduleProductMetricsRecalculation } from '@/features/products/product-metrics.jobs'
import { logInfo, logWarn } from '@/utils/logger'

// ---------------------------------------------------------------------------
// Typed application errors
// ---------------------------------------------------------------------------

export class ProductNotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const

  constructor(productId: string) {
    super(`Product "${productId}" was not found or is not active`)
    this.name = 'ProductNotFoundError'
  }
}

// ---------------------------------------------------------------------------
// DTO mappers
// ---------------------------------------------------------------------------

function toWishlistItemDto(item: WishlistItemWithProduct): WishlistItemDto {
  return {
    id: item.id,
    productId: item.productId,
    name: item.product.name,
    price: item.product.price.toString(),
    imageUrl: item.product.imageUrl ?? null,
    addedAt: item.createdAt.toISOString(),
  }
}

function toWishlistDto(wishlist: WishlistWithItems): WishlistDto {
  return {
    id: wishlist.id,
    userId: wishlist.userId,
    items: wishlist.items.map(toWishlistItemDto),
  }
}

function toEmptyWishlistDto(input: { id: string; userId: string }): WishlistDto {
  return {
    id: input.id,
    userId: input.userId,
    items: [],
  }
}

function toWishlistToggleDto(productId: string, wished: boolean): WishlistToggleDto {
  return {
    productId,
    wished,
  }
}

async function measureWishlistServiceCall<T>(
  operation: string,
  context: Record<string, unknown>,
  run: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now()
  logInfo('wishlist:service:before', {
    domain: 'wishlist',
    operation,
    ...context,
  })

  const warningTimer = setTimeout(() => {
    logWarn('wishlist:service:slow-await', {
      domain: 'wishlist',
      operation,
      durationMs: Date.now() - startedAt,
      ...context,
    })
  }, 5000)

  try {
    const result = await run()
    logInfo('wishlist:service:after', {
      domain: 'wishlist',
      operation,
      durationMs: Date.now() - startedAt,
      ...context,
    })
    return result
  } finally {
    clearTimeout(warningTimer)
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Return the wishlist for an authenticated user.
 * Creates an empty wishlist on first access (lazy initialisation).
 */
export async function getWishlist(userId: string): Promise<WishlistDto> {
  const wishlist = await measureWishlistServiceCall('findWishlistByUserId', { userId }, () =>
    findWishlistByUserId(userId),
  )
  if (wishlist) {
    logInfo('wishlist:service:before-dto-mapping', {
      domain: 'wishlist',
      operation: 'toWishlistDto',
      userId,
      itemCount: wishlist.items.length,
    })
    const dto = toWishlistDto(wishlist)
    logInfo('wishlist:service:after-dto-mapping', {
      domain: 'wishlist',
      operation: 'toWishlistDto',
      userId,
      itemCount: dto.items.length,
    })
    return dto
  }

  const created = await measureWishlistServiceCall('createWishlist', { userId }, () =>
    createWishlist(userId),
  )
  return toEmptyWishlistDto(created)
}

/**
 * Add a product to the user's wishlist.
 *
 * Throws:
 *   ProductNotFoundError        — product does not exist or is not active
 *   ProductAlreadyInWishlistError — product is already saved
 */
export async function addToWishlist(
  userId: string,
  productId: string,
): Promise<WishlistToggleDto> {
  if (!(await productExists(productId))) {
    throw new ProductNotFoundError(productId)
  }

  const wishlist = await measureWishlistServiceCall(
    'ensureWishlistIdentityForAdd',
    { userId },
    () => ensureWishlistIdentity(userId),
  )

  const inserted = await measureWishlistServiceCall(
    'addWishlistItemIdempotent',
    { userId, wishlistId: wishlist.id, productId },
    () => addWishlistItemIdempotent(wishlist.id, productId),
  )

  if (inserted) {
    scheduleProductMetricsRecalculation({
      reason: 'wishlist-added',
      dedupeKey: `product-metrics:wishlist-added:${wishlist.id}:${productId}`,
    })
  }

  const dto = toWishlistToggleDto(productId, true)

  logInfo('wishlist:service:toggle-result', {
    domain: 'wishlist',
    operation: 'addToWishlist',
    userId,
    productId,
    inserted,
    wished: dto.wished,
  })
  return dto
}

/**
 * Remove a product from the user's wishlist.
 *
 * Throws:
 *   WishlistItemNotFoundError — product is not in the wishlist
 */
export async function removeFromWishlist(
  userId: string,
  productId: string,
): Promise<WishlistToggleDto> {
  const wishlist = await measureWishlistServiceCall(
    'ensureWishlistIdentityForRemove',
    { userId },
    () => ensureWishlistIdentity(userId),
  )

  const removed = await measureWishlistServiceCall(
    'removeWishlistItemIdempotent',
    { userId, wishlistId: wishlist.id, productId },
    () => removeWishlistItemIdempotent(wishlist.id, productId),
  )

  if (removed) {
    scheduleProductMetricsRecalculation({
      reason: 'wishlist-removed',
      dedupeKey: `product-metrics:wishlist-removed:${wishlist.id}:${productId}`,
    })
  }

  const dto = toWishlistToggleDto(productId, false)

  logInfo('wishlist:service:toggle-result', {
    domain: 'wishlist',
    operation: 'removeFromWishlist',
    userId,
    productId,
    removed,
    wished: dto.wished,
  })
  return dto
}
