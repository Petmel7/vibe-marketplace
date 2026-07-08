import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '@/app/generated/prisma/client'

const {
  findManyMock,
  countMock,
  queryRawMock,
  categoryFindFirstMock,
  categoryFindManyMock,
  storeFindManyMock,
  ratingSummaryFindManyMock,
  productImageFindManyMock,
  variantFindManyMock,
} = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  countMock: vi.fn(),
  queryRawMock: vi.fn(),
  categoryFindFirstMock: vi.fn(),
  categoryFindManyMock: vi.fn(),
  storeFindManyMock: vi.fn(),
  ratingSummaryFindManyMock: vi.fn(),
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
    productRatingSummary: {
      findMany: ratingSummaryFindManyMock,
    },
    productImage: {
      findMany: productImageFindManyMock,
    },
    store: {
      findMany: storeFindManyMock,
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
    variantFindManyMock.mockResolvedValue([])
    storeFindManyMock.mockResolvedValue([])
    ratingSummaryFindManyMock.mockResolvedValue([])
    queryRawMock.mockResolvedValue([])
  })

  it('uses page-based pagination with service-provided filters and sorting', async () => {
    findManyMock.mockResolvedValue([{ ...makeProduct() }])
    countMock.mockResolvedValue(25)
    variantFindManyMock.mockResolvedValue([
      {
        id: 'var-1',
        productId: 'prod-1',
        sku: 'SKU-001',
        price: null,
        stock: 10,
      },
    ])
    storeFindManyMock.mockResolvedValue([
      {
        id: 'store-1',
        name: 'Test Store',
        slug: 'test-store',
      },
    ])

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
      },
    })
    expect(variantFindManyMock).toHaveBeenCalled()
    expect(queryRawMock).toHaveBeenCalled()
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
    variantFindManyMock.mockResolvedValue([
      {
        id: 'var-1',
        productId: 'prod-1',
        sku: 'SKU-001',
        price: null,
        stock: 10,
      },
    ])
    queryRawMock.mockResolvedValue([
      {
        productId: 'prod-1',
        storeId: 'store-1',
        storeName: 'Test Store',
        storeSlug: 'test-store',
        ratingAvg: null,
        ratingCount: null,
        rating1Count: null,
        rating2Count: null,
        rating3Count: null,
        rating4Count: null,
        rating5Count: null,
        ratingUpdatedAt: null,
        imageId: null,
        imageUrl: null,
        imageIsPrimary: null,
        imagePosition: null,
        imageCreatedAt: null,
      },
    ])
  })

  it('returns a lightweight limited product-card query without a count call', async () => {
    findManyMock.mockResolvedValue([{ ...makeProduct() }])

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
        storeId: true,
        imageUrl: true,
        status: true,
      }),
    })
    expect(variantFindManyMock).toHaveBeenCalledWith({
      where: {
        productId: {
          in: ['prod-1'],
        },
      },
      select: {
        id: true,
        productId: true,
        sku: true,
        price: true,
        stock: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    })
    expect(queryRawMock).toHaveBeenCalled()
    expect(countMock).not.toHaveBeenCalled()
    expect(result).toHaveLength(1)
  })
})

describe('searchProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    variantFindManyMock.mockResolvedValue([
      {
        id: 'var-1',
        productId: 'prod-1',
        sku: 'SKU-001',
        price: null,
        stock: 10,
      },
    ])
    storeFindManyMock.mockResolvedValue([
      {
        id: 'store-1',
        name: 'Test Store',
        slug: 'test-store',
      },
    ])
    ratingSummaryFindManyMock.mockResolvedValue([])
    productImageFindManyMock.mockResolvedValue([])
    queryRawMock
      .mockResolvedValueOnce([{
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
        status: 'PUBLISHED',
        publishedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        total: BigInt(1),
        inStock: BigInt(1),
        outOfStock: BigInt(0),
        min: { toString: () => '99.99' },
        max: { toString: () => '99.99' },
        rating5: BigInt(0),
        rating4: BigInt(1),
        rating3: BigInt(1),
        rating2: BigInt(1),
        rating1: BigInt(1),
        storeName: 'Test Store',
        storeSlug: 'test-store',
        ratingAvg: null,
        ratingCount: null,
        ratingUpdatedAt: null,
        imageId: null,
        primaryImageUrl: null,
        imageIsPrimary: null,
        imagePosition: null,
        imageCreatedAt: null,
      }])
      .mockResolvedValueOnce([{ id: 'cat-1', slug: 'dresses', name: 'Dresses', count: BigInt(1) }])
      .mockResolvedValueOnce([{ id: 'store-1', slug: 'test-store', name: 'Test Store', count: BigInt(1) }])
      .mockResolvedValueOnce([{ type: 'NEW', count: BigInt(1) }])
    findManyMock.mockResolvedValue([
      {
        ...makeProduct(),
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

    expect(queryRawMock).toHaveBeenCalledTimes(4)
    expect(findManyMock).not.toHaveBeenCalled()
    expect(variantFindManyMock).toHaveBeenCalled()
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
    expect(result.facets.ratings).toEqual([
      { minRating: 5, count: 0 },
      { minRating: 4, count: 1 },
      { minRating: 3, count: 1 },
      { minRating: 2, count: 1 },
      { minRating: 1, count: 1 },
    ])
  })

  it('reduces raw search query fan-out for newest catalog requests', async () => {
    await searchProducts({
      page: 1,
      limit: 12,
      sort: 'newest',
    })

    expect(queryRawMock).toHaveBeenCalledTimes(4)
  })

  it('keeps popular catalog requests bounded to the same raw query count', async () => {
    await searchProducts({
      page: 1,
      limit: 12,
      sort: 'popular',
    })

    expect(queryRawMock).toHaveBeenCalledTimes(4)
  })

  it('returns immediately without secondary loaders when product ids are empty', async () => {
    vi.clearAllMocks()
    findManyMock.mockReset()
    queryRawMock.mockReset()
    variantFindManyMock.mockReset()
    storeFindManyMock.mockReset()
    ratingSummaryFindManyMock.mockReset()
    productImageFindManyMock.mockReset()
    findManyMock.mockResolvedValue([])
    queryRawMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        total: BigInt(0),
        inStock: BigInt(0),
        outOfStock: BigInt(0),
        min: null,
        max: null,
        rating5: BigInt(0),
        rating4: BigInt(0),
        rating3: BigInt(0),
        rating2: BigInt(0),
        rating1: BigInt(0),
      }])

    const result = await searchProducts({
      page: 1,
      limit: 12,
      sort: 'newest',
    })

    expect(result.items).toEqual([])
    expect(queryRawMock).toHaveBeenCalledTimes(2)
    expect(findManyMock).not.toHaveBeenCalled()
    expect(variantFindManyMock).not.toHaveBeenCalled()
    expect(storeFindManyMock).not.toHaveBeenCalled()
    expect(ratingSummaryFindManyMock).not.toHaveBeenCalled()
    expect(productImageFindManyMock).not.toHaveBeenCalled()
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

})
