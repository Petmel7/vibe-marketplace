import { prisma } from '@/lib/prisma'
import type { Wishlist, WishlistItem, Product } from '@/app/generated/prisma/client'

export type WishlistItemWithProduct = WishlistItem & { product: Product }
export type WishlistWithItems = Wishlist & { items: WishlistItemWithProduct[] }

// Reused include shape — items newest-first so the UI shows recent additions at top.
const wishlistInclude = {
  items: {
    include: { product: true },
    orderBy: { createdAt: 'desc' as const },
  },
} as const

// ---------------------------------------------------------------------------
// Wishlist CRUD
// ---------------------------------------------------------------------------

/**
 * Return the wishlist for a user, creating it if it does not yet exist.
 * Uses upsert so concurrent first-requests do not race into two INSERTs.
 */
export async function findOrCreateWishlist(userId: string): Promise<WishlistWithItems> {
  return prisma.wishlist.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: wishlistInclude,
  })
}

// ---------------------------------------------------------------------------
// WishlistItem CRUD
// ---------------------------------------------------------------------------

/**
 * Find a single item by wishlist + product composite key.
 * Returns null when the product is not in the wishlist.
 */
export async function findWishlistItem(
  wishlistId: string,
  productId: string,
): Promise<WishlistItem | null> {
  return prisma.wishlistItem.findUnique({
    where: { wishlistId_productId: { wishlistId, productId } },
  })
}

/**
 * Insert a new wishlist item and return the updated wishlist with all items.
 * Caller is responsible for verifying the item does not already exist.
 */
export async function addWishlistItem(
  wishlistId: string,
  productId: string,
): Promise<WishlistWithItems> {
  await prisma.wishlistItem.create({ data: { wishlistId, productId } })
  return fetchWishlistWithItems(wishlistId)
}

/**
 * Delete a wishlist item and return the updated wishlist with remaining items.
 * Caller is responsible for verifying the item exists before calling this.
 */
export async function removeWishlistItem(
  wishlistId: string,
  productId: string,
): Promise<WishlistWithItems> {
  await prisma.wishlistItem.delete({
    where: { wishlistId_productId: { wishlistId, productId } },
  })
  return fetchWishlistWithItems(wishlistId)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchWishlistWithItems(wishlistId: string): Promise<WishlistWithItems> {
  return prisma.wishlist.findUniqueOrThrow({
    where: { id: wishlistId },
    include: wishlistInclude,
  })
}

/**
 * Check whether an active product with the given id exists.
 * Used by the service layer to validate before inserting a wishlist item.
 */
export async function productExists(productId: string): Promise<boolean> {
  const count = await prisma.product.count({
    where: { id: productId, isActive: true },
  })
  return count > 0
}
