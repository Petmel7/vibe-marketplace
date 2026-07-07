import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = {
  wishlist: {
    findUnique: vi.fn(),
    create: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    upsert: vi.fn(),
  },
  wishlistItem: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  product: {
    findMany: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))

const {
  addWishlistItemIdempotent,
  findWishlistByUserId,
  removeWishlistItemIdempotent,
} = await import('./wishlist.repository')

describe('wishlist.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not query products when the wishlist has no items', async () => {
    prismaMock.wishlist.findUnique.mockResolvedValue({
      id: 'wishlist-1',
      userId: 'user-1',
      createdAt: new Date('2026-07-01T09:00:00.000Z'),
      updatedAt: new Date('2026-07-01T09:00:00.000Z'),
    })
    prismaMock.wishlistItem.findMany.mockResolvedValue([])

    const result = await findWishlistByUserId('user-1')

    expect(prismaMock.wishlist.findUnique).toHaveBeenCalledOnce()
    expect(prismaMock.wishlistItem.findMany).toHaveBeenCalledOnce()
    expect(prismaMock.product.findMany).not.toHaveBeenCalled()
    expect(result).toEqual({
      id: 'wishlist-1',
      userId: 'user-1',
      createdAt: new Date('2026-07-01T09:00:00.000Z'),
      updatedAt: new Date('2026-07-01T09:00:00.000Z'),
      items: [],
    })
  })

  it('returns true when createMany inserts a wishlist item', async () => {
    prismaMock.wishlistItem.createMany.mockResolvedValue({ count: 1 })

    await expect(addWishlistItemIdempotent('wishlist-1', 'product-1')).resolves.toBe(true)
    expect(prismaMock.wishlistItem.createMany).toHaveBeenCalledWith({
      data: [{ wishlistId: 'wishlist-1', productId: 'product-1' }],
      skipDuplicates: true,
    })
  })

  it('returns false when createMany skips a duplicate wishlist item', async () => {
    prismaMock.wishlistItem.createMany.mockResolvedValue({ count: 0 })

    await expect(addWishlistItemIdempotent('wishlist-1', 'product-1')).resolves.toBe(false)
  })

  it('returns false when deleteMany removes no wishlist item', async () => {
    prismaMock.wishlistItem.deleteMany.mockResolvedValue({ count: 0 })

    await expect(removeWishlistItemIdempotent('wishlist-1', 'product-1')).resolves.toBe(false)
    expect(prismaMock.wishlistItem.deleteMany).toHaveBeenCalledWith({
      where: { wishlistId: 'wishlist-1', productId: 'product-1' },
    })
  })
})
