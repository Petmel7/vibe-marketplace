import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '@/app/generated/prisma/client'

const {
  findManyMock,
  countMock,
  queryRawMock,
  categoryFindFirstMock,
  categoryFindManyMock,
  productImageFindManyMock,
  variantFindManyMock,
} = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  countMock: vi.fn(),
  queryRawMock: vi.fn(),
  categoryFindFirstMock: vi.fn(),
  categoryFindManyMock: vi.fn(),
  productImageFindManyMock: vi.fn(),
  variantFindManyMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: findManyMock,
      count: countMock,
      findFirst: vi.fn(),
    },
    productVariant: {
      findMany: variantFindManyMock,
    },
    productImage: {
      findMany: productImageFindManyMock,
    },
    category: {
      findFirst: categoryFindFirstMock,
      findMany: categoryFindManyMock,
    },
    $queryRaw: queryRawMock,
  },
}))

import {
  findProductCards,
  findCategoriesByParentIds,
  findCategoryBySlug,
  findProducts,
  searchProducts,
} from './product.repository'

function makeProduct(overrides: Partial<Record<string, unknown>> = {}): Product {
  return {
    id: 'prod-1',
    storeId: 'store-1',
    categoryId: 'cat-1',
    name: 'Test Product',
    description: 'A test product',
    price: { toString: () => '99.99' },
    imageUrl: 'https://example.com/img.jpg',
    isActive: true,
    sku: 'SKU-001',
    isHit: false,
    isNew: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    searchVector: null,
    ...overrides,
  } as unknown as Product
}

describe('findProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    productImageFindManyMock.mockResolvedValue([])
  })

  it('uses page-based pagination with service-provided filters and sorting', async () => {
    findManyMock.mockResolvedValue([{ ...makeProduct(), variants: [] }])
    countMock.mockResolvedValue(25)

    const where = { isActive: true, categoryId: { in: ['cat-1', 'cat-2'] } }
    const orderBy = [
      { price: 'asc' as const },
      { createdAt: 'desc' as const },
      { id: 'desc' as const },
    ]

    const result = await findProducts({ where, orderBy, page: 2, limit: 12 })

    expect(findManyMock).toHaveBeenCalledWith({
      where,
      skip: 12,
      take: 12,
      orderBy,
      select: {
        id: true,
        storeId: true,
        categoryId: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        isActive: true,
        sku: true,
        isHit: true,
        isNew: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        variants: {
          select: {
            id: true,
            sku: true,
            price: true,
            stock: true,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
        images: {
          select: {
            id: true,
            url: true,
            isPrimary: true,
            position: true,
            createdAt: true,
          },
          orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        ratingSummary: {
          select: {
            productId: true,
            ratingAvg: true,
            ratingCount: true,
            rating1Count: true,
            rating2Count: true,
            rating3Count: true,
            rating4Count: true,
            rating5Count: true,
            updatedAt: true,
          },
        },
      },
    })
    expect(countMock).toHaveBeenCalledWith({ where })
    expect(result.total).toBe(25)
  })

  it('supports variant size and price filters in the where clause', async () => {
    findManyMock.mockResolvedValue([])
    countMock.mockResolvedValue(0)

    const where = {
      isActive: true,
      price: { gte: 100, lte: 500 },
      variants: { some: { size: 'M' } },
    }

    await findProducts({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      page: 1,
      limit: 12,
    })

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
      }),
    )
    expect(countMock).toHaveBeenCalledWith({ where })
  })
})

describe('findProductCards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a lightweight limited product-card query without a count call', async () => {
    findManyMock.mockResolvedValue([{ ...makeProduct(), variants: [] }])

    const where = { isActive: true }
    const orderBy = [{ createdAt: 'desc' as const }, { id: 'desc' as const }]

    const result = await findProductCards({
      where,
      orderBy,
      limit: 4,
    })

    expect(findManyMock).toHaveBeenCalledWith({
      where,
      take: 4,
      orderBy,
      select: expect.objectContaining({
        id: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        ratingSummary: {
          select: expect.objectContaining({
            ratingAvg: true,
            ratingCount: true,
          }),
        },
      }),
    })
    expect(countMock).not.toHaveBeenCalled()
    expect(result).toHaveLength(1)
  })
})

describe('searchProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryRawMock
      .mockResolvedValueOnce([{ id: 'prod-1' }])
      .mockResolvedValueOnce([{ count: BigInt(1) }])
      .mockResolvedValueOnce([{ id: 'cat-1', slug: 'dresses', name: 'Dresses', count: BigInt(1) }])
      .mockResolvedValueOnce([{ id: 'store-1', slug: 'test-store', name: 'Test Store', count: BigInt(1) }])
      .mockResolvedValueOnce([{ inStock: BigInt(1), outOfStock: BigInt(0) }])
      .mockResolvedValueOnce([{ type: 'NEW', count: BigInt(1) }])
      .mockResolvedValueOnce([{ min: { toString: () => '99.99' }, max: { toString: () => '99.99' } }])
      .mockResolvedValueOnce([{ count: BigInt(0) }])
      .mockResolvedValueOnce([{ count: BigInt(1) }])
      .mockResolvedValueOnce([{ count: BigInt(1) }])
      .mockResolvedValueOnce([{ count: BigInt(1) }])
      .mockResolvedValueOnce([{ count: BigInt(1) }])
    findManyMock.mockResolvedValue([
      {
        ...makeProduct(),
        variants: [],
        images: [],
        store: {
          id: 'store-1',
          name: 'Test Store',
          slug: 'test-store',
        },
        ratingSummary: null,
      },
    ])
  })

  it('returns hydrated items, totals, and facets for public search', async () => {
    const result = await searchProducts({
      q: 'jacket',
      sort: 'relevance',
      page: 1,
      limit: 12,
      inStock: true,
    })

    expect(queryRawMock).toHaveBeenCalledTimes(12)
    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['prod-1'],
        },
      },
      select: expect.objectContaining({
        variants: {
          select: {
            id: true,
            sku: true,
            price: true,
            stock: true,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      }),
    })
    expect(result.total).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.facets.categories[0]).toEqual({
      id: 'cat-1',
      slug: 'dresses',
      name: 'Dresses',
      count: 1,
    })
    expect(result.facets.availability).toEqual({
      inStock: 1,
      outOfStock: 0,
    })
  })
})

describe('category repository helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('findCategoryBySlug returns the active category node', async () => {
    categoryFindFirstMock.mockResolvedValue({ id: 'cat-root', parentId: null })

    const result = await findCategoryBySlug('clothing-shoes')

    expect(categoryFindFirstMock).toHaveBeenCalledWith({
      where: {
        slug: 'clothing-shoes',
        isActive: true,
      },
      select: {
        id: true,
        parentId: true,
      },
    })
    expect(result).toEqual({ id: 'cat-root', parentId: null })
  })

  it('findCategoriesByParentIds fetches all children in one query', async () => {
    categoryFindManyMock.mockResolvedValue([
      { id: 'cat-a', parentId: 'cat-root' },
      { id: 'cat-b', parentId: 'cat-root' },
    ])

    const result = await findCategoriesByParentIds(['cat-root'])

    expect(categoryFindManyMock).toHaveBeenCalledWith({
      where: {
        parentId: {
          in: ['cat-root'],
        },
        isActive: true,
      },
      select: {
        id: true,
        parentId: true,
      },
    })
    expect(result).toEqual([
      { id: 'cat-a', parentId: 'cat-root' },
      { id: 'cat-b', parentId: 'cat-root' },
    ])
  })

  it('findCategoriesByParentIds returns an empty array when no parents are provided', async () => {
    const result = await findCategoriesByParentIds([])

    expect(categoryFindManyMock).not.toHaveBeenCalled()
    expect(result).toEqual([])
  })
})
