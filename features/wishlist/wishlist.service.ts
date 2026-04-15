import {
  findOrCreateWishlist,
  findWishlistItem,
  addWishlistItem,
  removeWishlistItem,
  productExists,
} from '@/features/wishlist/wishlist.repository'
import type { WishlistDto, WishlistItemDto } from '@/features/wishlist/wishlist.dto'
import type { WishlistWithItems, WishlistItemWithProduct } from '@/features/wishlist/wishlist.repository'

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

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Return the wishlist for an authenticated user.
 * Creates an empty wishlist on first access (lazy initialisation).
 */
export async function getWishlist(userId: string): Promise<WishlistDto> {
  const wishlist = await findOrCreateWishlist(userId)
  return toWishlistDto(wishlist)
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

  const wishlist = await findOrCreateWishlist(userId)
  const existing = await findWishlistItem(wishlist.id, productId)

  if (existing) {
    throw new ProductAlreadyInWishlistError(productId)
  }

  const updated = await addWishlistItem(wishlist.id, productId)
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
  const wishlist = await findOrCreateWishlist(userId)
  const existing = await findWishlistItem(wishlist.id, productId)

  if (!existing) {
    throw new WishlistItemNotFoundError(productId)
  }

  const updated = await removeWishlistItem(wishlist.id, productId)
  return toWishlistDto(updated)
}
