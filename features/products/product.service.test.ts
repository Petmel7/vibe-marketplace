import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma, type Product, type ProductVariant } from '@/app/generated/prisma/client'
import {
  ProductNotFoundError,
  getInitialHitProductsPage,
  getInitialNewProductsPage,
  getProduct,
  getHomepageProductSections,
  listHitProducts,
  listNewProducts,
  listProducts,
  listProductsByCategorySlug,
  searchProducts,
} from './product.service'
import * as repository from './product.repository'
import * as productBadgeService from './product-badge.service'
import * as categoryCache from '@/features/categories/category.cache'
import * as promotionsService from '@/features/promotions/promotions.service'

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))

vi.mock('./product.repository', () => ({
  findProducts: vi.fn(),
  findProductCards: vi.fn(),
  findProductCardsPage: vi.fn(),
  findCategoryBySlug: vi.fn(),
  findProductById: vi.fn(),
  searchProducts: vi.fn(),
}))
vi.mock('@/features/categories/category.cache', () => ({
  getActiveCategoryTraversalNodesCached: vi.fn(),
}))
vi.mock('./product-badge.service', () => ({
  resolveMarketplaceBadgesForProducts: vi.fn(),
}))
vi.mock('@/features/promotions/promotions.service', () => ({
  getVisibleProductPromotions: vi.fn(),
}))

const mockedRepository = vi.mocked(repository)
const mockedBadgeService = vi.mocked(productBadgeService)
const mockedCategoryCache = vi.mocked(categoryCache)
const mockedPromotionsService = vi.mocked(promotionsService)

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
    store: {
      id: 'store-1',
      name: 'Test Store',
      slug: 'test-store',
    },
    ratingSummary: null,
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
    mockedCategoryCache.getActiveCategoryTraversalNodesCached.mockResolvedValue([])
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
    mockedPromotionsService.getVisibleProductPromotions.mockResolvedValue(new Map())
  })

  it('returns mapped product list with pagination metadata', async () => {
    vi.mocked(repository.searchProducts).mockResolvedValue({
      items: [makeListProduct()],
      total: 1,
      page: 1,
      limit: 12,
      facets: {
        categories: [{ id: 'cat-1', slug: 'dresses', name: 'Dresses', count: 1 }],
        stores: [{ id: 'store-1', slug: 'test-store', name: 'Test Store', count: 1 }],
        availability: { inStock: 1, outOfStock: 0 },
        ratings: [{ minRating: 4, count: 1 }],
        badges: [{ type: 'NEW', count: 1 }],
        priceRange: { min: { toString: () => '99.99' } as never, max: { toString: () => '99.99' } as never },
      },
    })

    const result = await searchProducts({ q: 'jacket', page: 1, limit: 12 })

    expect(result.items).toHaveLength(1)
    expect(result.pagination.total).toBe(1)
    expect(result.pagination.totalPages).toBe(1)
    expect(result.items[0]?.price).toBe('99.99')
    expect(result.items[0]?.storeName).toBe('Test Store')
    expect(result.facets.priceRange.min).toBe('99.99')
    expect(result.sort).toBe('relevance')
    expect(result.pagination.hasNextPage).toBe(false)
  })

  it('passes filters and relevance sort to the repository', async () => {
    mockedRepository.findCategoryBySlug.mockResolvedValue({ id: 'cat-root', parentId: null })
    mockedCategoryCache.getActiveCategoryTraversalNodesCached.mockResolvedValue([
      { id: 'cat-root', parentId: null, slug: 'clothing-shoes', isActive: true },
      { id: 'cat-child', parentId: 'cat-root', slug: 'hoodies', isActive: true },
    ])
    vi.mocked(repository.searchProducts).mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      limit: 10,
      facets: {
        categories: [],
        stores: [],
        availability: { inStock: 0, outOfStock: 0 },
        ratings: [],
        badges: [],
        priceRange: { min: null, max: null },
      },
    })

    await searchProducts({
      q: 'hoodie',
      category: 'clothing-shoes',
      minPrice: 100,
      maxPrice: 500,
      inStock: true,
      rating: 4,
      badge: 'HIT',
      store: 'test-store',
      sort: 'relevance',
      page: 2,
      limit: 10,
    })

    expect(mockedRepository.findCategoryBySlug).toHaveBeenCalledWith('clothing-shoes')
    expect(repository.searchProducts).toHaveBeenCalledWith({
      q: 'hoodie',
      categoryIds: ['cat-root', 'cat-child'],
      minPrice: 100,
      maxPrice: 500,
      inStock: true,
      rating: 4,
      badge: 'HIT',
      store: { slug: 'test-store' },
      sort: 'relevance',
      page: 2,
      limit: 10,
    })
  })

  it('falls back to newest sort when q is empty and sort is relevance', async () => {
    vi.mocked(repository.searchProducts).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 12,
      facets: {
        categories: [],
        stores: [],
        availability: { inStock: 0, outOfStock: 0 },
        ratings: [],
        badges: [],
        priceRange: { min: null, max: null },
      },
    })

    await searchProducts({ q: '', sort: 'relevance', page: 1, limit: 12 })

    expect(repository.searchProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        q: undefined,
        sort: 'newest',
      }),
    )
  })
})

describe('listProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedCategoryCache.getActiveCategoryTraversalNodesCached.mockResolvedValue([])
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
          href: '/products/prod-1',
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
          ratingSummary: {
            averageRating: 0,
            totalCount: 0,
            rating1Count: 0,
            rating2Count: 0,
            rating3Count: 0,
            rating4Count: 0,
            rating5Count: 0,
          },
          promotionSummary: null,
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
          href: '/products/prod-1',
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
          ratingSummary: {
            averageRating: 0,
            totalCount: 0,
            rating1Count: 0,
            rating2Count: 0,
            rating3Count: 0,
            rating4Count: 0,
            rating5Count: 0,
          },
          promotionSummary: null,
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
    mockedCategoryCache.getActiveCategoryTraversalNodesCached.mockResolvedValue([
      { id: 'cat-root', parentId: null, slug: 'clothing-shoes', isActive: true },
      { id: 'cat-parent', parentId: 'cat-root', slug: 'tops', isActive: true },
      { id: 'cat-leaf-a', parentId: 'cat-root', slug: 'shirts', isActive: true },
      { id: 'cat-leaf-b', parentId: 'cat-parent', slug: 'hoodies', isActive: true },
    ])
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
    expect(mockedCategoryCache.getActiveCategoryTraversalNodesCached).toHaveBeenCalledTimes(1)
    expect(mockedRepository.findProducts).toHaveBeenCalledWith({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        store: {
          isActive: true,
        },
        AND: [{ OR: [{ categoryId: null }, { category: { isActive: true } }] }],
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

  it('does not hang on cyclic category trees and skips already visited nodes', async () => {
    mockedRepository.findCategoryBySlug.mockResolvedValue({ id: 'cat-root', parentId: 'cat-loop' })
    mockedCategoryCache.getActiveCategoryTraversalNodesCached.mockResolvedValue([
      { id: 'cat-root', parentId: 'cat-loop', slug: 'root', isActive: true },
      { id: 'cat-child', parentId: 'cat-root', slug: 'child', isActive: true },
      { id: 'cat-loop', parentId: 'cat-child', slug: 'loop', isActive: true },
    ])
    mockedRepository.findProducts.mockResolvedValue({ items: [], total: 0 })

    await listProducts({
      category: 'root',
      page: 1,
      limit: 12,
      sort: 'newest',
    })

    expect(mockedRepository.findProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categoryId: {
            in: ['cat-root', 'cat-child', 'cat-loop'],
          },
        }),
      }),
    )
  })

  it('excludes inactive descendants because traversal only uses active categories', async () => {
    mockedRepository.findCategoryBySlug.mockResolvedValue({ id: 'cat-root', parentId: null })
    mockedCategoryCache.getActiveCategoryTraversalNodesCached.mockResolvedValue([
      { id: 'cat-root', parentId: null, slug: 'root', isActive: true },
      { id: 'cat-active-child', parentId: 'cat-root', slug: 'active-child', isActive: true },
    ])
    mockedRepository.findProducts.mockResolvedValue({ items: [], total: 0 })

    await listProducts({
      category: 'root',
      page: 1,
      limit: 12,
      sort: 'newest',
    })

    expect(mockedRepository.findProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categoryId: {
            in: ['cat-root', 'cat-active-child'],
          },
        }),
      }),
    )
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
        AND: [{ OR: [{ categoryId: null }, { category: { isActive: true } }] }],
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
    mockedCategoryCache.getActiveCategoryTraversalNodesCached.mockResolvedValue([])
  })

  it('passes isNew=true to the repository for new products', async () => {
    mockedRepository.findProducts.mockResolvedValue({ items: [], total: 0 })
    mockedRepository.findProductCards.mockResolvedValue([])

    await listNewProducts({ page: 1, limit: 12 })

    expect(mockedRepository.findProducts).toHaveBeenCalledWith({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        store: {
          isActive: true,
        },
        AND: [
          { OR: [{ categoryId: null }, { category: { isActive: true } }] },
          {
            publishedAt: {
              gte: expect.any(Date),
            },
          },
        ],
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

  it('maps rating summary into the New Products list DTO', async () => {
    mockedRepository.findProducts.mockResolvedValue({
      items: [
        makeListProduct({}, [makeVariant()]),
      ].map((item) => ({
        ...item,
        ratingSummary: {
          productId: 'prod-1',
          ratingAvg: new Prisma.Decimal('3.0'),
          ratingCount: 1,
          rating1Count: 0,
          rating2Count: 0,
          rating3Count: 1,
          rating4Count: 0,
          rating5Count: 0,
          updatedAt: new Date('2026-01-05T00:00:00.000Z'),
        },
      })),
      total: 1,
    })

    const result = await listNewProducts({ page: 1, limit: 12 })

    expect(result.items[0]?.ratingSummary).toEqual({
      averageRating: 3,
      totalCount: 1,
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 1,
      rating4Count: 0,
      rating5Count: 0,
    })
  })

  it('passes isHit=true to the repository for hit products', async () => {
    mockedRepository.findProducts.mockResolvedValue({ items: [], total: 0 })
    mockedRepository.findProductCards.mockResolvedValue([])

    await listHitProducts({ page: 2, limit: 6 })

    expect(mockedRepository.findProducts).toHaveBeenCalledWith({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        store: {
          isActive: true,
        },
        AND: [
          { OR: [{ categoryId: null }, { category: { isActive: true } }] },
          {
            badges: {
              some: {
                type: 'HIT',
                OR: [{ startsAt: null }, { startsAt: { lte: expect.any(Date) } }],
                AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: expect.any(Date) } }] }],
              },
            },
          },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      page: 2,
      limit: 6,
    })
    expect(mockedBadgeService.resolveMarketplaceBadgesForProducts).not.toHaveBeenCalled()
  })

  it('builds homepage product sections via no-count card queries', async () => {
    mockedRepository.findProductCards
      .mockResolvedValueOnce([
        makeListProduct(
          { id: 'prod-new', isNew: true, isHit: false },
          [makeVariant({ productId: 'prod-new' })],
        ),
      ])
      .mockResolvedValueOnce([
        makeListProduct(
          { id: 'prod-hit', isNew: false, isHit: true },
          [makeVariant({ productId: 'prod-hit' })],
        ),
      ])

    const result = await getHomepageProductSections()

    expect(mockedRepository.findProductCards).toHaveBeenNthCalledWith(1, {
      where: {
        isActive: true,
        status: 'PUBLISHED',
        store: {
          isActive: true,
        },
        AND: [
          { OR: [{ categoryId: null }, { category: { isActive: true } }] },
          {
            publishedAt: {
              gte: expect.any(Date),
            },
          },
        ],
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      limit: 4,
    })
    expect(mockedRepository.findProductCards).toHaveBeenNthCalledWith(2, {
      where: {
        isActive: true,
        status: 'PUBLISHED',
        store: {
          isActive: true,
        },
        AND: [
          { OR: [{ categoryId: null }, { category: { isActive: true } }] },
          {
            badges: {
              some: {
                type: 'HIT',
                OR: [{ startsAt: null }, { startsAt: { lte: expect.any(Date) } }],
                AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: expect.any(Date) } }] }],
              },
            },
          },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      limit: 4,
    })
    expect(mockedRepository.findProducts).not.toHaveBeenCalled()
    expect(result.newProducts[0]).toMatchObject({
      id: 'prod-new',
      ratingSummary: {
        averageRating: 0,
        totalCount: 0,
      },
    })
    expect(result.hitProducts[0]).toMatchObject({
      id: 'prod-hit',
      ratingSummary: {
        averageRating: 0,
        totalCount: 0,
      },
    })
  })

  it('falls back to latest published products when strict new homepage query is empty', async () => {
    mockedRepository.findProductCards
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        makeListProduct(
          { id: 'prod-new-fallback', publishedAt: null, createdAt: new Date('2026-06-01T00:00:00.000Z') },
          [makeVariant({ productId: 'prod-new-fallback' })],
        ),
        makeListProduct(
          { id: 'prod-hit-fallback', publishedAt: null, createdAt: new Date('2026-05-31T00:00:00.000Z') },
          [makeVariant({ productId: 'prod-hit-fallback' })],
        ),
      ])
      .mockResolvedValueOnce([
        makeListProduct(
          { id: 'prod-hit', isNew: false, isHit: true },
          [makeVariant({ productId: 'prod-hit' })],
        ),
      ])

    const result = await getHomepageProductSections()

    expect(mockedRepository.findProductCards).toHaveBeenNthCalledWith(2, {
      where: {
        isActive: true,
        status: 'PUBLISHED',
        store: {
          isActive: true,
        },
        AND: [{ OR: [{ categoryId: null }, { category: { isActive: true } }] }],
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      limit: 8,
    })
    expect(result.newProducts[0]).toMatchObject({
      id: 'prod-new-fallback',
    })
    expect(result.hitProducts[0]).toMatchObject({
      id: 'prod-hit',
    })
  })

  it('falls back to latest published products when strict hit homepage query is empty', async () => {
    mockedRepository.findProductCards
      .mockResolvedValueOnce([
        makeListProduct(
          { id: 'prod-new', isNew: true, isHit: false },
          [makeVariant({ productId: 'prod-new' })],
        ),
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        makeListProduct(
          { id: 'prod-hit-fallback', createdAt: new Date('2026-06-02T00:00:00.000Z') },
          [makeVariant({ productId: 'prod-hit-fallback' })],
        ),
        makeListProduct(
          { id: 'prod-new', createdAt: new Date('2026-06-01T00:00:00.000Z') },
          [makeVariant({ productId: 'prod-new' })],
        ),
      ])

    const result = await getHomepageProductSections()

    expect(mockedRepository.findProductCards).toHaveBeenNthCalledWith(3, {
      where: {
        isActive: true,
        status: 'PUBLISHED',
        store: {
          isActive: true,
        },
        AND: [{ OR: [{ categoryId: null }, { category: { isActive: true } }] }],
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      limit: 8,
    })
    expect(result.newProducts[0]).toMatchObject({
      id: 'prod-new',
    })
    expect(result.hitProducts[0]).toMatchObject({
      id: 'prod-hit-fallback',
    })
  })

  it('falls back for both homepage sections when published products exist but strict sections are empty', async () => {
    mockedRepository.findProductCards
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        makeListProduct({ id: 'prod-published-a', publishedAt: null }, [makeVariant({ productId: 'prod-published-a' })]),
        makeListProduct({ id: 'prod-published-b', publishedAt: null }, [makeVariant({ productId: 'prod-published-b' })]),
        makeListProduct({ id: 'prod-published-c', publishedAt: null }, [makeVariant({ productId: 'prod-published-c' })]),
        makeListProduct({ id: 'prod-published-d', publishedAt: null }, [makeVariant({ productId: 'prod-published-d' })]),
        makeListProduct({ id: 'prod-published-e', publishedAt: null }, [makeVariant({ productId: 'prod-published-e' })]),
      ])
      .mockResolvedValueOnce([])

    const result = await getHomepageProductSections()

    expect(result.newProducts).toHaveLength(4)
    expect(result.hitProducts).toHaveLength(1)
    expect(result.newProducts[0]?.id).toBe('prod-published-a')
    expect(result.hitProducts[0]?.id).toBe('prod-published-e')
    expect(mockedRepository.findProductCards).toHaveBeenCalledTimes(3)
  })

  it('avoids duplicate products between homepage sections by supplementing from fallback candidates', async () => {
    mockedRepository.findProductCards
      .mockResolvedValueOnce([
        makeListProduct({ id: 'prod-shared', isNew: true }, [makeVariant({ productId: 'prod-shared' })]),
      ])
      .mockResolvedValueOnce([
        makeListProduct({ id: 'prod-shared', isHit: true }, [makeVariant({ productId: 'prod-shared' })]),
      ])
      .mockResolvedValueOnce([
        makeListProduct({ id: 'prod-shared' }, [makeVariant({ productId: 'prod-shared' })]),
        makeListProduct({ id: 'prod-hit-fallback' }, [makeVariant({ productId: 'prod-hit-fallback' })]),
      ])

    const result = await getHomepageProductSections()

    expect(result.newProducts[0]?.id).toBe('prod-shared')
    expect(result.hitProducts[0]?.id).toBe('prod-hit-fallback')
  })

  it('builds the initial New Products page via limit+1 card query without count', async () => {
    mockedRepository.findProductCardsPage.mockResolvedValue({
      items: [makeListProduct({ id: 'prod-new' }, [makeVariant({ productId: 'prod-new' })])],
      hasNextPage: true,
    })

    const result = await getInitialNewProductsPage(12)

    expect(mockedRepository.findProductCardsPage).toHaveBeenCalledWith({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        store: {
          isActive: true,
        },
        AND: [
          { OR: [{ categoryId: null }, { category: { isActive: true } }] },
          {
            publishedAt: {
              gte: expect.any(Date),
            },
          },
        ],
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      page: 1,
      limit: 12,
    })
    expect(mockedRepository.findProducts).not.toHaveBeenCalled()
    expect(result.page).toBe(1)
    expect(result.hasNextPage).toBe(true)
    expect(result.items).toHaveLength(1)
  })

  it('builds the initial Hit Products page via limit+1 card query without count', async () => {
    mockedRepository.findProductCardsPage.mockResolvedValue({
      items: [makeListProduct({ id: 'prod-hit', isHit: true }, [makeVariant({ productId: 'prod-hit' })])],
      hasNextPage: false,
    })

    const result = await getInitialHitProductsPage(12)

    expect(mockedRepository.findProductCardsPage).toHaveBeenCalledWith({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        store: {
          isActive: true,
        },
        AND: [
          { OR: [{ categoryId: null }, { category: { isActive: true } }] },
          {
            badges: {
              some: {
                type: 'HIT',
                OR: [{ startsAt: null }, { startsAt: { lte: expect.any(Date) } }],
                AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: expect.any(Date) } }] }],
              },
            },
          },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      page: 1,
      limit: 12,
    })
    expect(mockedRepository.findProducts).not.toHaveBeenCalled()
    expect(result.page).toBe(1)
    expect(result.hasNextPage).toBe(false)
    expect(result.items).toHaveLength(1)
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

  it('returns zeroed rating summary in the Hit Products list DTO when a product has no reviews', async () => {
    mockedRepository.findProducts.mockResolvedValue({
      items: [makeListProduct({}, [makeVariant()])],
      total: 1,
    })

    const result = await listHitProducts({ page: 1, limit: 12 })

    expect(result.items[0]?.ratingSummary).toEqual({
      averageRating: 0,
      totalCount: 0,
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 0,
      rating4Count: 0,
      rating5Count: 0,
    })
  })
})

describe('listProductsByCategorySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedCategoryCache.getActiveCategoryTraversalNodesCached.mockResolvedValue([])
  })

  it('returns products for a valid category including descendants', async () => {
    mockedRepository.findCategoryBySlug.mockResolvedValue({ id: 'cat-root', parentId: null })
    mockedCategoryCache.getActiveCategoryTraversalNodesCached.mockResolvedValue([
      { id: 'cat-root', parentId: null, slug: 'clothing-shoes', isActive: true },
      { id: 'cat-leaf', parentId: 'cat-root', slug: 'hoodies', isActive: true },
    ])
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
        AND: [{ OR: [{ categoryId: null }, { category: { isActive: true } }] }],
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
    mockedCategoryCache.getActiveCategoryTraversalNodesCached.mockResolvedValue([])
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
    expect(result.promotionSummary).toBeNull()
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

  it('maps the highest-priority visible seller promotion into list and detail DTOs', async () => {
    mockedRepository.findProducts.mockResolvedValue({
      items: [makeListProduct({}, [makeVariant()])],
      total: 1,
    })
    mockedRepository.findProductById.mockResolvedValue(makeDetailProduct({}, [makeVariant()]))
    mockedPromotionsService.getVisibleProductPromotions.mockResolvedValue(
      new Map([
        [
          'prod-1',
          {
            id: 'promo-1',
            name: 'Store 10%',
            code: 'STORE10',
            ownerType: 'SELLER',
            storeId: 'store-1',
            type: 'COUPON_CODE',
            discountType: 'PERCENTAGE',
            discountValue: '10.00',
            endsAt: '2026-07-31T00:00:00.000Z',
            targetType: 'PRODUCT',
            targetId: 'prod-1',
          },
        ],
      ]),
    )

    const [listResult, detailResult] = await Promise.all([
      listProducts({ page: 1, limit: 12, sort: 'newest' }),
      getProduct('prod-1'),
    ])

    expect(listResult.items[0]?.promotionSummary).toEqual({
      id: 'promo-1',
      name: 'Store 10%',
      code: 'STORE10',
      ownerType: 'SELLER',
      storeId: 'store-1',
      type: 'COUPON_CODE',
      discountType: 'PERCENTAGE',
      discountValue: '10.00',
      endsAt: '2026-07-31T00:00:00.000Z',
      targetType: 'PRODUCT',
      targetId: 'prod-1',
    })
    expect(detailResult.promotionSummary?.code).toBe('STORE10')
    expect(detailResult.promotionSummary?.discountValue).toBe('10.00')
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
