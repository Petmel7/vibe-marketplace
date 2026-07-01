import { prisma } from '@/lib/prisma'
import { logInfo, logWarn } from '@/utils/logger'
import type { Wishlist, WishlistItem, Product } from '@/app/generated/prisma/client'
export { productExists } from '@/lib/db/productExists'

type WishlistProductPreview = Pick<Product, 'id' | 'name' | 'price' | 'imageUrl'>

export type WishlistItemWithProduct = WishlistItem & { product: WishlistProductPreview }
export type WishlistWithItems = Wishlist & { items: WishlistItemWithProduct[] }

// Reused include shape — items newest-first so the UI shows recent additions at top.
const wishlistInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          imageUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
} as const

async function measureWishlistRepositoryCall<T>(
  operation: string,
  run: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now()
  logInfo('wishlist:repository:before', {
    domain: 'wishlist',
    operation,
  })

  const warningTimer = setTimeout(() => {
    logWarn('wishlist:repository:slow-await', {
      domain: 'wishlist',
      operation,
      durationMs: Date.now() - startedAt,
    })
  }, 5000)

  try {
    const result = await run()
    logInfo('wishlist:repository:after', {
      domain: 'wishlist',
      operation,
      durationMs: Date.now() - startedAt,
    })
    return result
  } finally {
    clearTimeout(warningTimer)
  }
}

// ---------------------------------------------------------------------------
// Wishlist CRUD
// ---------------------------------------------------------------------------

/**
 * Return the wishlist for a user, creating it if it does not yet exist.
 * Uses upsert so concurrent first-requests do not race into two INSERTs.
 */
export async function findWishlistByUserId(userId: string): Promise<WishlistWithItems | null> {
  return measureWishlistRepositoryCall('findWishlistByUserId', () =>
    prisma.wishlist.findUnique({
      where: { userId },
      include: wishlistInclude,
    }),
  )
}

export async function createWishlist(userId: string): Promise<Wishlist> {
  return measureWishlistRepositoryCall('createWishlist', () =>
    prisma.wishlist.create({
      data: { userId },
    }),
  )
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
  return measureWishlistRepositoryCall('findWishlistItem', () =>
    prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId, productId } },
    }),
  )
}

/**
 * Insert a new wishlist item and return the updated wishlist with all items.
 * Caller is responsible for verifying the item does not already exist.
 */
export async function addWishlistItem(
  wishlistId: string,
  productId: string,
): Promise<WishlistWithItems> {
  await measureWishlistRepositoryCall('createWishlistItem', () =>
    prisma.wishlistItem.create({ data: { wishlistId, productId } }),
  )
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
  await measureWishlistRepositoryCall('deleteWishlistItem', () =>
    prisma.wishlistItem.delete({
      where: { wishlistId_productId: { wishlistId, productId } },
    }),
  )
  return fetchWishlistWithItems(wishlistId)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchWishlistWithItems(wishlistId: string): Promise<WishlistWithItems> {
  return measureWishlistRepositoryCall('fetchWishlistWithItems', () =>
    prisma.wishlist.findUniqueOrThrow({
      where: { id: wishlistId },
      include: wishlistInclude,
    }),
  )
}
