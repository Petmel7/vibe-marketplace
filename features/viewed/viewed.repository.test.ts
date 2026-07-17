import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  viewedProduct: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  },
  $executeRaw: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

import { ProductStatus } from '@/app/generated/prisma/client'
import {
  findRecentlyViewed,
  mergeGuestViewedProducts,
  upsertViewedProduct,
} from './viewed.repository'

describe('viewed.repository', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z'))
    prismaMock.viewedProduct.findMany.mockReset()
    prismaMock.viewedProduct.upsert.mockReset()
    prismaMock.viewedProduct.update.mockReset()
    prismaMock.viewedProduct.findUnique.mockReset()
    prismaMock.viewedProduct.deleteMany.mockReset()
    prismaMock.$executeRaw.mockReset()
    prismaMock.viewedProduct.deleteMany.mockResolvedValue({ count: 0 })
    prismaMock.viewedProduct.findMany.mockResolvedValue([])
    prismaMock.viewedProduct.findUnique.mockResolvedValue(null)
    prismaMock.viewedProduct.update.mockResolvedValue({})
    prismaMock.viewedProduct.upsert.mockResolvedValue({})
    prismaMock.$executeRaw.mockResolvedValue(0)
  })

  it('filters to storefront-visible products, excludes entries older than 30 days, and limits reads to 12', async () => {
    await findRecentlyViewed({ userId: 'user-1' })

    expect(prismaMock.viewedProduct.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        viewedAt: {
          lt: new Date('2026-06-17T12:00:00.000Z'),
        },
      },
    })

    expect(prismaMock.viewedProduct.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        viewedAt: {
          gte: new Date('2026-06-17T12:00:00.000Z'),
        },
        product: {
          is: {
            isActive: true,
            status: ProductStatus.PUBLISHED,
            store: {
              isActive: true,
            },
          },
        },
      },
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
      orderBy: { viewedAt: 'desc' },
      take: 12,
    })
  })

  it('cleans expired rows before upserting and keeps the trimmed history cap at 12', async () => {
    await upsertViewedProduct({ sessionId: 'guest-1' }, 'product-1')

    expect(prismaMock.viewedProduct.deleteMany).toHaveBeenCalledWith({
      where: {
        sessionId: 'guest-1',
        viewedAt: {
          lt: new Date('2026-06-17T12:00:00.000Z'),
        },
      },
    })

    expect(prismaMock.viewedProduct.upsert).toHaveBeenCalledWith({
      where: { sessionId_productId: { sessionId: 'guest-1', productId: 'product-1' } },
      create: {
        sessionId: 'guest-1',
        productId: 'product-1',
        viewedAt: new Date('2026-07-17T12:00:00.000Z'),
      },
      update: {
        viewedAt: new Date('2026-07-17T12:00:00.000Z'),
      },
    })
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1)
  })

  it('still merges guest history into the authenticated user flow', async () => {
    prismaMock.viewedProduct.findMany
      .mockResolvedValueOnce([
        {
          id: 'view-1',
          productId: 'product-1',
          viewedAt: new Date('2026-07-16T12:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([])

    await mergeGuestViewedProducts('guest-1', 'user-1')

    expect(prismaMock.viewedProduct.update).toHaveBeenCalledWith({
      where: { id: 'view-1' },
      data: { userId: 'user-1', sessionId: null },
    })
    expect(prismaMock.viewedProduct.deleteMany).toHaveBeenLastCalledWith({
      where: { sessionId: 'guest-1' },
    })
  })
})
