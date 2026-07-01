import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = {
  wishlist: {
    findUnique: vi.fn(),
    create: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  wishlistItem: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
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

const { findWishlistByUserId } = await import('./wishlist.repository')

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
})
