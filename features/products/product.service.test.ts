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

vi.mock('./product.repository', () => ({
  findProducts: vi.fn(),
  findCategoryBySlug: vi.fn(),
  findCategoriesByParentIds: vi.fn(),
  findProductById: vi.fn(),
  searchProducts: vi.fn(),
}))

const mockedRepository = vi.mocked(repository)

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
  } as repository.ProductListProduct
}

describe('searchProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mapped product list with pagination metadata', async () => {
    vi.mocked(repository.searchProducts).mockResolvedValue({ items: [makeListProduct()], total: 1 })

    const result = await searchProducts({ q: 'jacket', page: 1, limit: 12 })

    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.totalPages).toBe(1)
    expect(result.data[0]?.price).toBe('99.99')
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
          sku: 'SKU-001',
          isHit: false,
          isNew: true,
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
          sku: 'SKU-001',
          isHit: false,
          isNew: true,
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
      where: { isActive: true, isNew: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      page: 1,
      limit: 12,
    })
  })

  it('passes isHit=true to the repository for hit products', async () => {
    mockedRepository.findProducts.mockResolvedValue({ items: [], total: 0 })

    await listHitProducts({ page: 2, limit: 6 })

    expect(mockedRepository.findProducts).toHaveBeenCalledWith({
      where: { isActive: true, isHit: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      page: 2,
      limit: 6,
    })
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
    const product = { ...makeProduct(), variants: [variant] } as repository.ProductWithVariants
    mockedRepository.findProductById.mockResolvedValue(product)

    const result = await getProduct('prod-1')

    expect(result.id).toBe('prod-1')
    expect(result.variants).toHaveLength(1)
    expect(result.variants[0]).toEqual({
      id: 'var-1',
      sku: 'SKU-001-S-RED',
      size: 'S',
      color: 'Red',
      price: null,
      stock: 10,
    })
  })

  it('throws ProductNotFoundError when product does not exist', async () => {
    mockedRepository.findProductById.mockResolvedValue(null)

    await expect(getProduct('nonexistent-id')).rejects.toThrow(ProductNotFoundError)
  })
})
