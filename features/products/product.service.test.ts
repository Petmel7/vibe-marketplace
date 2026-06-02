import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product, ProductVariant } from '@/app/generated/prisma/client'
import {
  ProductNotFoundError,
  getProduct,
  listHitProducts,
  listNewProducts,
  listProducts,
  listProductsByCategorySlug,
  searchProducts,
} from './product.service'
import * as repository from './product.repository'
import * as productBadgeService from './product-badge.service'

vi.mock('./product.repository', () => ({
  findProducts: vi.fn(),
  findCategoryBySlug: vi.fn(),
  findCategoriesByParentIds: vi.fn(),
  findProductById: vi.fn(),
  searchProducts: vi.fn(),
}))
vi.mock('./product-badge.service', () => ({
  recalculateProductMetricsAndBadges: vi.fn(),
  resolveMarketplaceBadgesForProducts: vi.fn(),
}))

const mockedRepository = vi.mocked(repository)
const mockedBadgeService = vi.mocked(productBadgeService)

function makeProduct(overrides: Partial<Record<string, unknown>> = {}): Product {
  return {
    id: 'prod-1',
    storeId: 'store-1',
    categoryId: 'cat-leaf',
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
    searchVector: null,
    ...overrides,
  } as unknown as Product
}

function makeVariant(overrides: Partial<Record<string, unknown>> = {}): ProductVariant {
  return {
    id: 'var-1',
    productId: 'prod-1',
    sku: 'SKU-001-S-RED',
    size: 'S',
    color: 'Red',
    price: null,
    stock: 10,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as unknown as ProductVariant
}

function makeListProduct(
  overrides: Partial<Record<string, unknown>> = {},
  variants: ProductVariant[] = [],
): repository.ProductListProduct {
  return {
    ...makeProduct(overrides),
    variants,
    images: [],
  } as repository.ProductListProduct
}

function makeDetailProduct(
  overrides: Partial<Record<string, unknown>> = {},
  variants: ProductVariant[] = [],
): repository.ProductDetailProduct {
  return {
    ...makeProduct(overrides),
    variants,
    images: [],
    ratingSummary: null,
    store: {
      name: 'Test Store',
      slug: 'test-store',
    },
    category: {
      name: 'Category',
      slug: 'category',
    },
  } as repository.ProductDetailProduct
}

describe('searchProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedBadgeService.resolveMarketplaceBadgesForProducts.mockImplementation(async (products) =>
      new Map(
        products.map((product) => [
          product.id,
          product.id === 'prod-hit'
            ? [
                {
                  id: 'badge-hit',
                  productId: product.id,
                  type: 'HIT',
                  source: 'SYSTEM',
                  score: '99.0000',
                  startsAt: '2026-01-01T00:00:00.000Z',
                  endsAt: null,
                  createdAt: '2026-01-01T00:00:00.000Z',
                  updatedAt: '2026-01-01T00:00:00.000Z',
                },
              ]
            : [
                {
                  id: 'badge-new',
                  productId: product.id,
                  type: 'NEW',
                  source: 'SYSTEM',
                  score: null,
                  startsAt: '2026-01-01T00:00:00.000Z',
                  endsAt: '2026-01-31T00:00:00.000Z',
                  createdAt: '2026-01-01T00:00:00.000Z',
                  updatedAt: '2026-01-01T00:00:00.000Z',
                },
              ],
        ]),
      ),
    )
  })

  it('returns mapped product list with pagination metadata', async () => {
    vi.mocked(repository.searchProducts).mockResolvedValue({ items: [makeListProduct()], total: 1 })

    const result = await searchProducts({ q: 'jacket', page: 1, limit: 12 })

    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.totalPages).toBe(1)
    expect(result.data[0]?.price).toBe('99.99')
    expect(result.badgeContext).toBe('DEFAULT')
    expect(result.meta.hasNextPage).toBe(false)
  })

  it('passes q, page, and limit to the repository', async () => {
    vi.mocked(repository.searchProducts).mockResolvedValue({ items: [], total: 0 })

    await searchProducts({ q: 'hoodie', page: 2, limit: 10 })

    expect(repository.searchProducts).toHaveBeenCalledWith({ q: 'hoodie', page: 2, limit: 10 })
  })
})

describe('listProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mapped catalog products with requested pagination fields', async () => {
    mockedRepository.findProducts.mockResolvedValue({
      items: [makeListProduct({}, [makeVariant()])],
      total: 13,
    })

    const result = await listProducts({ page: 1, limit: 12, sort: 'newest' })

    expect(result).toEqual({
      items: [
        {
          id: 'prod-1',
          storeId: 'store-1',
          name: 'Test Product',
          description: 'A test product',
          price: '99.99',
          imageUrl: 'https://example.com/img.jpg',
          isActive: true,
          inStock: true,
          totalStock: 10,
          stockStatus: 'IN_STOCK',
          sku: 'SKU-001',
          isHit: false,
          isNew: true,
          badgeContext: 'DEFAULT',
          badges: [
            {
              id: 'badge-new',
              type: 'NEW',
              source: 'SYSTEM',
              score: null,
              startsAt: '2026-01-01T00:00:00.000Z',
              endsAt: '2026-01-31T00:00:00.000Z',
            },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
          variants: [
            {
              id: 'var-1',
              sku: 'SKU-001-S-RED',
              size: 'S',
              color: 'Red',
              price: null,
              stock: 10,
            },
          ],
        },
      ],
      total: 13,
      page: 1,
      totalPages: 2,
      data: [
        {
          id: 'prod-1',
          storeId: 'store-1',
          name: 'Test Product',
          description: 'A test product',
          price: '99.99',
          imageUrl: 'https://example.com/img.jpg',
          isActive: true,
          inStock: true,
          totalStock: 10,
          stockStatus: 'IN_STOCK',
          sku: 'SKU-001',
          isHit: false,
          isNew: true,
          badgeContext: 'DEFAULT',
          badges: [
            {
              id: 'badge-new',
              type: 'NEW',
              source: 'SYSTEM',
              score: null,
              startsAt: '2026-01-01T00:00:00.000Z',
              endsAt: '2026-01-31T00:00:00.000Z',
            },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
          variants: [
            {
              id: 'var-1',
              sku: 'SKU-001-S-RED',
              size: 'S',
              color: 'Red',
              price: null,
              stock: 10,
            },
          ],
        },
      ],
      meta: {
        total: 13,
        page: 1,
        limit: 12,
        totalPages: 2,
        hasNextPage: true,
      },
      badgeContext: 'DEFAULT',
    })
  })

  it('resolves descendant categories before querying products', async () => {
    mockedRepository.findCategoryBySlug.mockResolvedValue({ id: 'cat-root', parentId: null })
    mockedRepository.findCategoriesByParentIds
      .mockResolvedValueOnce([
        { id: 'cat-parent', parentId: 'cat-root' },
        { id: 'cat-leaf-a', parentId: 'cat-root' },
      ])
      .mockResolvedValueOnce([{ id: 'cat-leaf-b', parentId: 'cat-parent' }])
      .mockResolvedValueOnce([])
    mockedRepository.findProducts.mockResolvedValue({ items: [], total: 0 })

    await listProducts({
      category: 'clothing-shoes',
      size: 'M',
      priceMin: 100,
      priceMax: 500,
      sort: 'price_asc',
      page: 2,
      limit: 10,
    })

    expect(mockedRepository.findCategoryBySlug).toHaveBeenCalledWith('clothing-shoes')
    expect(mockedRepository.findCategoriesByParentIds).toHaveBeenNthCalledWith(1, ['cat-root'])
    expect(mockedRepository.findCategoriesByParentIds).toHaveBeenNthCalledWith(2, ['cat-parent', 'cat-leaf-a'])
    expect(mockedRepository.findCategoriesByParentIds).toHaveBeenNthCalledWith(3, ['cat-leaf-b'])
    expect(mockedRepository.findProducts).toHaveBeenCalledWith({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        store: {
          isActive: true,
        },
        categoryId: {
          in: ['cat-root', 'cat-parent', 'cat-leaf-a', 'cat-leaf-b'],
        },
        price: {
          gte: 100,
          lte: 500,
        },
        variants: {
          some: {
            size: 'M',
          },
        },
      },
      orderBy: [{ price: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
      page: 2,
      limit: 10,
    })
  })

  it('returns an empty result when the category slug is unknown', async () => {
    mockedRepository.findCategoryBySlug.mockResolvedValue(null)

    const result = await listProducts({
      category: 'unknown',
      page: 1,
      limit: 12,
      sort: 'newest',
    })

    expect(mockedRepository.findProducts).not.toHaveBeenCalled()
    expect(result).toEqual({
      badgeContext: 'DEFAULT',
      items: [],
      total: 0,
      page: 1,
      totalPages: 0,
      data: [],
      meta: {
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
      },
    })
  })

  it('passes the default newest sort ordering to the repository', async () => {
    mockedRepository.findProducts.mockResolvedValue({ items: [], total: 0 })

    await listProducts({ page: 1, limit: 12, sort: 'newest', storeId: 'store-abc' })

    expect(mockedRepository.findProducts).toHaveBeenCalledWith({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        store: {
          isActive: true,
        },
        storeId: 'store-abc',
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      page: 1,
      limit: 12,
    })
  })
})

describe('filtered product listings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes isNew=true to the repository for new products', async () => {
    mockedRepository.findProducts.mockResolvedValue({ items: [], total: 0 })

    await listNewProducts({ page: 1, limit: 12 })

    expect(mockedRepository.findProducts).toHaveBeenCalledWith({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        store: {
          isActive: true,
        },
        publishedAt: {
          gte: expect.any(Date),
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      page: 1,
      limit: 12,
    })
  })

  it('returns only the NEW badge in the New Arrivals context even when HIT also exists internally', async () => {
    mockedRepository.findProducts.mockResolvedValue({
      items: [makeListProduct()],
      total: 1,
    })
    mockedBadgeService.resolveMarketplaceBadgesForProducts.mockResolvedValue(
      new Map([
        [
          'prod-1',
          [
            {
              id: 'badge-hit',
              productId: 'prod-1',
              type: 'HIT',
              source: 'SYSTEM',
              score: '40.0000',
              startsAt: '2026-01-01T00:00:00.000Z',
              endsAt: null,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
            {
              id: 'badge-new',
              productId: 'prod-1',
              type: 'NEW',
              source: 'SYSTEM',
              score: null,
              startsAt: '2026-01-01T00:00:00.000Z',
              endsAt: '2026-01-31T00:00:00.000Z',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        ],
      ]),
    )

    const result = await listNewProducts({ page: 1, limit: 12 })

    expect(result.badgeContext).toBe('NEW')
    expect(result.items[0]?.badges.map((badge) => badge.type)).toEqual(['NEW'])
    expect(result.items[0]?.isHit).toBe(true)
    expect(result.items[0]?.isNew).toBe(true)
  })

  it('passes isHit=true to the repository for hit products', async () => {
    mockedRepository.findProducts.mockResolvedValue({ items: [], total: 0 })

    await listHitProducts({ page: 2, limit: 6 })

    expect(mockedBadgeService.recalculateProductMetricsAndBadges).toHaveBeenCalledTimes(1)
    expect(mockedRepository.findProducts).toHaveBeenCalledWith({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        store: {
          isActive: true,
        },
        badges: {
          some: {
            type: 'HIT',
            OR: [{ startsAt: null }, { startsAt: { lte: expect.any(Date) } }],
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: expect.any(Date) } }] }],
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      page: 2,
      limit: 6,
    })
  })

  it('returns only the HIT badge in the Hit Products context even when NEW also exists internally', async () => {
    mockedRepository.findProducts.mockResolvedValue({
      items: [makeListProduct()],
      total: 1,
    })
    mockedBadgeService.resolveMarketplaceBadgesForProducts.mockResolvedValue(
      new Map([
        [
          'prod-1',
          [
            {
              id: 'badge-hit',
              productId: 'prod-1',
              type: 'HIT',
              source: 'SYSTEM',
              score: '40.0000',
              startsAt: '2026-01-01T00:00:00.000Z',
              endsAt: null,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
            {
              id: 'badge-new',
              productId: 'prod-1',
              type: 'NEW',
              source: 'SYSTEM',
              score: null,
              startsAt: '2026-01-01T00:00:00.000Z',
              endsAt: '2026-01-31T00:00:00.000Z',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        ],
      ]),
    )

    const result = await listHitProducts({ page: 1, limit: 12 })

    expect(result.badgeContext).toBe('HIT')
    expect(result.items[0]?.badges.map((badge) => badge.type)).toEqual(['HIT'])
    expect(result.items[0]?.isHit).toBe(true)
    expect(result.items[0]?.isNew).toBe(true)
  })
})

describe('listProductsByCategorySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns products for a valid category including descendants', async () => {
    mockedRepository.findCategoryBySlug.mockResolvedValue({ id: 'cat-root', parentId: null })
    mockedRepository.findCategoriesByParentIds
      .mockResolvedValueOnce([{ id: 'cat-leaf', parentId: 'cat-root' }])
      .mockResolvedValueOnce([])
    mockedRepository.findProducts.mockResolvedValue({
      items: [makeListProduct({}, [makeVariant()])],
      total: 1,
    })

    const result = await listProductsByCategorySlug('clothing-shoes', { page: 1, limit: 12 })

    expect(result.items).toHaveLength(1)
    expect(mockedRepository.findProducts).toHaveBeenCalledWith({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        store: {
          isActive: true,
        },
        categoryId: {
          in: ['cat-root', 'cat-leaf'],
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      page: 1,
      limit: 12,
    })
  })

  it('returns an empty array for an unknown slug', async () => {
    mockedRepository.findCategoryBySlug.mockResolvedValue(null)

    const result = await listProductsByCategorySlug('unknown', { page: 1, limit: 12 })

    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })
})

describe('getProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns product detail DTO including mapped variants', async () => {
    const variant = makeVariant()
    const product = makeDetailProduct({}, [variant])
    mockedRepository.findProductById.mockResolvedValue(product)

    const result = await getProduct('prod-1')

    expect(result.id).toBe('prod-1')
    expect(result.badgeContext).toBe('DEFAULT')
    expect(result.inStock).toBe(true)
    expect(result.totalStock).toBe(10)
    expect(result.stockStatus).toBe('IN_STOCK')
    expect(result.variants).toHaveLength(1)
    expect(mockedBadgeService.resolveMarketplaceBadgesForProducts).toHaveBeenCalledWith([
      {
        id: 'prod-1',
        status: 'PUBLISHED',
        publishedAt: new Date('2026-01-01T00:00:00.000Z'),
        isActive: true,
      },
    ])
    expect(result.variants[0]).toEqual({
      id: 'var-1',
      sku: 'SKU-001-S-RED',
      size: 'S',
      color: 'Red',
      price: null,
      stock: 10,
    })
    expect(result.ratingSummary).toEqual({
      averageRating: 0,
      totalCount: 0,
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 0,
      rating4Count: 0,
      rating5Count: 0,
    })
  })

  it('throws ProductNotFoundError when product does not exist', async () => {
    mockedRepository.findProductById.mockResolvedValue(null)

    await expect(getProduct('nonexistent-id')).rejects.toThrow(ProductNotFoundError)
  })

  it('prefers the primary ProductImage over the legacy imageUrl in listing DTOs', async () => {
    mockedRepository.findProducts.mockResolvedValue({
      items: [
        makeListProduct(
          { imageUrl: 'https://example.com/legacy.jpg' },
          [],
        ),
      ].map((item) => ({
        ...item,
        images: [
          {
            id: 'image-1',
            url: 'https://example.com/primary.webp',
            isPrimary: true,
            position: 0,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
      })),
      total: 1,
    })

    const result = await listNewProducts({ page: 1, limit: 12 })

    expect(result.items[0]?.imageUrl).toBe('https://example.com/primary.webp')
  })

  it('keeps a published product visible when all variants are out of stock', async () => {
    mockedRepository.findProducts.mockResolvedValue({
      items: [makeListProduct({}, [makeVariant({ stock: 0 })])],
      total: 1,
    })

    const result = await listProducts({ page: 1, limit: 12, sort: 'newest' })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      inStock: false,
      totalStock: 0,
      stockStatus: 'OUT_OF_STOCK',
    })
  })

  it('derives stock state correctly across multiple variants', async () => {
    mockedRepository.findProductById.mockResolvedValue({
      ...makeDetailProduct(),
      variants: [
        makeVariant({ id: 'var-1', stock: 0 }),
        makeVariant({ id: 'var-2', stock: 2 }),
        makeVariant({ id: 'var-3', stock: 1 }),
      ],
      images: [],
    } as repository.ProductDetailProduct)

    const result = await getProduct('prod-1')

    expect(result.inStock).toBe(true)
    expect(result.totalStock).toBe(3)
    expect(result.stockStatus).toBe('LOW_STOCK')
  })

  it('maps product rating summary into the detail DTO', async () => {
    mockedRepository.findProductById.mockResolvedValue({
      ...makeDetailProduct(),
      ratingSummary: {
        productId: 'prod-1',
        ratingAvg: {
          toNumber: () => 4.4,
        },
        ratingCount: 5,
        rating1Count: 0,
        rating2Count: 1,
        rating3Count: 0,
        rating4Count: 1,
        rating5Count: 3,
        updatedAt: new Date('2026-01-05T00:00:00.000Z'),
      },
    } as repository.ProductDetailProduct)

    const result = await getProduct('prod-1')

    expect(result.ratingSummary).toEqual({
      averageRating: 4.4,
      totalCount: 5,
      rating1Count: 0,
      rating2Count: 1,
      rating3Count: 0,
      rating4Count: 1,
      rating5Count: 3,
    })
  })

  it('returns a single prioritized badge in DEFAULT context when multiple badges exist internally', async () => {
    mockedRepository.findProducts.mockResolvedValue({
      items: [makeListProduct()],
      total: 1,
    })
    mockedBadgeService.resolveMarketplaceBadgesForProducts.mockResolvedValue(
      new Map([
        [
          'prod-1',
          [
            {
              id: 'badge-hit',
              productId: 'prod-1',
              type: 'HIT',
              source: 'SYSTEM',
              score: '40.0000',
              startsAt: '2026-01-01T00:00:00.000Z',
              endsAt: null,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
            {
              id: 'badge-new',
              productId: 'prod-1',
              type: 'NEW',
              source: 'SYSTEM',
              score: null,
              startsAt: '2026-01-01T00:00:00.000Z',
              endsAt: '2026-01-31T00:00:00.000Z',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        ],
      ]),
    )

    const result = await listProducts({ page: 1, limit: 12, sort: 'newest' })

    expect(result.badgeContext).toBe('DEFAULT')
    expect(result.items[0]?.badges.map((badge) => badge.type)).toEqual(['HIT'])
  })
})
