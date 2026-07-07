import { prisma } from '@/lib/prisma'
import { logInfo, logWarn } from '@/utils/logger'
import type { Prisma, Wishlist, WishlistItem, Product } from '@/app/generated/prisma/client'
export { productExists } from '@/lib/db/productExists'

type WishlistProductPreview = Pick<Product, 'id' | 'name' | 'price' | 'imageUrl'>

export type WishlistItemWithProduct = WishlistItem & { product: WishlistProductPreview }
export type WishlistWithItems = Wishlist & { items: WishlistItemWithProduct[] }

const wishlistBaseSelect = {
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WishlistSelect

const wishlistItemSelect = {
  id: true,
  wishlistId: true,
  productId: true,
  createdAt: true,
} satisfies Prisma.WishlistItemSelect

const wishlistProductSelect = {
  id: true,
  name: true,
  price: true,
  imageUrl: true,
} satisfies Prisma.ProductSelect

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

/**
 * Return the wishlist for a user, creating it if it does not yet exist.
 * Uses an explicit item/product hydration path so an empty wishlist does not
 * trigger a follow-up `WHERE id IN (NULL)` product query from nested includes.
 */
export async function findWishlistByUserId(userId: string): Promise<WishlistWithItems | null> {
  return measureWishlistRepositoryCall('findWishlistByUserId', async () => {
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      select: wishlistBaseSelect,
    })

    if (!wishlist) {
      return null
    }

    return attachWishlistItems(wishlist)
  })
}

export async function createWishlist(userId: string): Promise<Wishlist> {
  return measureWishlistRepositoryCall('createWishlist', () =>
    prisma.wishlist.create({
      data: { userId },
    }),
  )
}

export async function ensureWishlistIdentity(
  userId: string,
): Promise<Pick<Wishlist, 'id' | 'userId'>> {
  return measureWishlistRepositoryCall('ensureWishlistIdentity', () =>
    prisma.wishlist.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: {
        id: true,
        userId: true,
      },
    }),
  )
}

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

export async function addWishlistItem(
  wishlistId: string,
  productId: string,
): Promise<WishlistWithItems> {
  await measureWishlistRepositoryCall('createWishlistItem', () =>
    prisma.wishlistItem.create({ data: { wishlistId, productId } }),
  )
  return fetchWishlistWithItems(wishlistId)
}

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

export async function addWishlistItemIdempotent(
  wishlistId: string,
  productId: string,
): Promise<boolean> {
  return measureWishlistRepositoryCall('addWishlistItemIdempotent', async () => {
    const result = await prisma.wishlistItem.createMany({
      data: [{ wishlistId, productId }],
      skipDuplicates: true,
    })

    return result.count > 0
  })
}

export async function removeWishlistItemIdempotent(
  wishlistId: string,
  productId: string,
): Promise<boolean> {
  return measureWishlistRepositoryCall('removeWishlistItemIdempotent', async () => {
    const result = await prisma.wishlistItem.deleteMany({
      where: { wishlistId, productId },
    })

    return result.count > 0
  })
}

async function fetchWishlistWithItems(wishlistId: string): Promise<WishlistWithItems> {
  return measureWishlistRepositoryCall('fetchWishlistWithItems', async () => {
    const wishlist = await prisma.wishlist.findUniqueOrThrow({
      where: { id: wishlistId },
      select: wishlistBaseSelect,
    })

    return attachWishlistItems(wishlist)
  })
}

async function attachWishlistItems(
  wishlist: Pick<Wishlist, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
): Promise<WishlistWithItems> {
  const items = await prisma.wishlistItem.findMany({
    where: { wishlistId: wishlist.id },
    select: wishlistItemSelect,
    orderBy: { createdAt: 'desc' },
  })

  const productIds = [...new Set(items.map((item) => item.productId))]

  if (productIds.length === 0) {
    return {
      ...wishlist,
      items: [],
    }
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: wishlistProductSelect,
  })
  const productsById = new Map(products.map((product) => [product.id, product]))

  return {
    ...wishlist,
    items: items.flatMap((item) => {
      const product = productsById.get(item.productId)
      if (!product) {
        return []
      }

      return [
        {
          ...item,
          product,
        },
      ]
    }),
  }
}
