import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  heroBannerFindManyMock,
  heroBannerCountMock,
  heroBannerFindUniqueMock,
  heroBannerCreateMock,
  heroBannerUpdateMock,
  heroBannerDeleteMock,
  transactionMock,
  categoryFindUniqueMock,
  productFindUniqueMock,
  storeFindUniqueMock,
  promotionFindUniqueMock,
} = vi.hoisted(() => ({
  heroBannerFindManyMock: vi.fn(),
  heroBannerCountMock: vi.fn(),
  heroBannerFindUniqueMock: vi.fn(),
  heroBannerCreateMock: vi.fn(),
  heroBannerUpdateMock: vi.fn(),
  heroBannerDeleteMock: vi.fn(),
  transactionMock: vi.fn((operations) => Promise.all(operations)),
  categoryFindUniqueMock: vi.fn(),
  productFindUniqueMock: vi.fn(),
  storeFindUniqueMock: vi.fn(),
  promotionFindUniqueMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    heroBanner: {
      findMany: heroBannerFindManyMock,
      count: heroBannerCountMock,
      findUnique: heroBannerFindUniqueMock,
      create: heroBannerCreateMock,
      update: heroBannerUpdateMock,
      delete: heroBannerDeleteMock,
    },
    category: {
      findUnique: categoryFindUniqueMock,
    },
    product: {
      findUnique: productFindUniqueMock,
    },
    store: {
      findUnique: storeFindUniqueMock,
    },
    promotion: {
      findUnique: promotionFindUniqueMock,
    },
    $transaction: transactionMock,
  },
}))

import {
  categoryExists,
  heroBannerInclude,
  listActiveHeroBanners,
  listAdminHeroBanners,
  updateHeroBannerSortOrders,
} from './hero.repository'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listActiveHeroBanners', () => {
  it('returns only active published banners ordered by sort order', async () => {
    const now = new Date('2026-07-29T12:00:00.000Z')
    heroBannerFindManyMock.mockResolvedValue([])

    await listActiveHeroBanners({ now, limit: 5 })

    expect(heroBannerFindManyMock).toHaveBeenCalledWith({
      where: {
        status: 'PUBLISHED',
        publishStartAt: {
          lte: now,
        },
        OR: [{ publishEndAt: null }, { publishEndAt: { gt: now } }],
      },
      include: heroBannerInclude,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
      take: 5,
    })
  })
})

describe('listAdminHeroBanners', () => {
  it('applies status and destination filters with pagination', async () => {
    heroBannerFindManyMock.mockResolvedValue([])

    await listAdminHeroBanners({
      page: 2,
      limit: 10,
      status: 'DRAFT',
      destinationType: 'CATEGORY',
    })

    expect(heroBannerFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'DRAFT',
          destinationType: 'CATEGORY',
        },
        skip: 10,
        take: 10,
      }),
    )
  })
})

describe('target existence helpers', () => {
  it('checks category references by id only', async () => {
    categoryFindUniqueMock.mockResolvedValue({ id: 'cat-1' })

    await expect(categoryExists('cat-1')).resolves.toBe(true)

    expect(categoryFindUniqueMock).toHaveBeenCalledWith({
      where: { id: 'cat-1' },
      select: { id: true },
    })
  })
})

describe('updateHeroBannerSortOrders', () => {
  it('updates sort orders in a single transaction', async () => {
    heroBannerUpdateMock.mockResolvedValue({})

    await updateHeroBannerSortOrders([
      { id: 'banner-2', sortOrder: 0 },
      { id: 'banner-1', sortOrder: 1 },
    ])

    expect(heroBannerUpdateMock).toHaveBeenCalledTimes(2)
    expect(transactionMock).toHaveBeenCalledTimes(1)
  })
})
