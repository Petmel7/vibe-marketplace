import {
  findWishlistByUserId,
  createWishlist,
  findWishlistItem,
  addWishlistItem,
  removeWishlistItem,
  productExists,
} from '@/features/wishlist/wishlist.repository'
import type { WishlistDto, WishlistItemDto } from '@/features/wishlist/wishlist.dto'
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

export class ProductAlreadyInWishlistError extends Error {
  readonly code = 'ALREADY_IN_WISHLIST' as const

  constructor(productId: string) {
    super(`Product "${productId}" is already in the wishlist`)
    this.name = 'ProductAlreadyInWishlistError'
  }
}

export class WishlistItemNotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const

  constructor(productId: string) {
    super(`Product "${productId}" is not in the wishlist`)
    this.name = 'WishlistItemNotFoundError'
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

function toWishlistDtoFromExistingOrCreated(
  wishlist: WishlistWithItems | { id: string; userId: string },
): WishlistDto {
  if ('items' in wishlist) {
    return toWishlistDto(wishlist)
  }

  return toEmptyWishlistDto(wishlist)
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
    return toWishlistDto(wishlist)
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
): Promise<WishlistDto> {
  if (!(await productExists(productId))) {
    throw new ProductNotFoundError(productId)
  }

  const wishlist = await measureWishlistServiceCall('getWishlistForAdd', { userId }, async () => {
    const existingWishlist = await findWishlistByUserId(userId)
    return existingWishlist ?? createWishlist(userId)
  })
  const existing = await measureWishlistServiceCall(
    'findWishlistItemForAdd',
    { userId, wishlistId: wishlist.id, productId },
    () => findWishlistItem(wishlist.id, productId),
  )

  if (existing) {
    return toWishlistDtoFromExistingOrCreated(wishlist)
  }

  const updated = await measureWishlistServiceCall(
    'addWishlistItem',
    { userId, wishlistId: wishlist.id, productId },
    () => addWishlistItem(wishlist.id, productId),
  )
  const addedItem = updated.items.find((item) => item.productId === productId)
  if (addedItem) {
    scheduleProductMetricsRecalculation({
      reason: 'wishlist-added',
      dedupeKey: `product-metrics:wishlist-added:${addedItem.id}`,
    })
  }

  return toWishlistDto(updated)
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
): Promise<WishlistDto> {
  const wishlist = await measureWishlistServiceCall('getWishlistForRemove', { userId }, async () => {
    const existingWishlist = await findWishlistByUserId(userId)
    return existingWishlist ?? createWishlist(userId)
  })
  const existing = await measureWishlistServiceCall(
    'findWishlistItemForRemove',
    { userId, wishlistId: wishlist.id, productId },
    () => findWishlistItem(wishlist.id, productId),
  )

  if (!existing) {
    return toWishlistDtoFromExistingOrCreated(wishlist)
  }

  const updated = await measureWishlistServiceCall(
    'removeWishlistItem',
    { userId, wishlistId: wishlist.id, productId },
    () => removeWishlistItem(wishlist.id, productId),
  )
  scheduleProductMetricsRecalculation({
    reason: 'wishlist-removed',
    dedupeKey: `product-metrics:wishlist-removed:${existing.id}`,
  })

  return toWishlistDto(updated)
}
