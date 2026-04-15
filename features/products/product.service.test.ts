import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listProducts, getProduct, searchProducts, ProductNotFoundError } from './product.service'
import * as repository from './product.repository'
import type { Product, ProductVariant } from '@/app/generated/prisma/client'

vi.mock('./product.repository', () => ({
  findProducts: vi.fn(),
  findProductById: vi.fn(),
  searchProducts: vi.fn(),
}))

const mockedRepository = vi.mocked(repository)

function makeProduct(overrides: Partial<Record<string, unknown>> = {}): Product {
  return {
    id: 'prod-1',
    storeId: 'store-1',
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

// ---------------------------------------------------------------------------
// searchProducts
// ---------------------------------------------------------------------------

describe('searchProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mapped product list with pagination metadata', async () => {
    vi.mocked(repository.searchProducts).mockResolvedValue({ items: [makeProduct()], total: 1 })

    const result = await searchProducts({ q: 'jacket', page: 1, limit: 20 })

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
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    })
  })

  it('passes q, page, and limit to the repository', async () => {
    vi.mocked(repository.searchProducts).mockResolvedValue({ items: [], total: 0 })

    await searchProducts({ q: 'hoodie', page: 2, limit: 10 })

    expect(repository.searchProducts).toHaveBeenCalledWith({ q: 'hoodie', page: 2, limit: 10 })
  })

  it('returns empty items and zero total when nothing matches', async () => {
    vi.mocked(repository.searchProducts).mockResolvedValue({ items: [], total: 0 })

    const result = await searchProducts({ q: 'xyznotfound', page: 1, limit: 20 })

    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })

  it('serializes Decimal price to string', async () => {
    const product = makeProduct({ price: { toString: () => '49.00' } })
    vi.mocked(repository.searchProducts).mockResolvedValue({ items: [product], total: 1 })

    const result = await searchProducts({ q: 'shirt', page: 1, limit: 20 })

    expect(result.items[0].price).toBe('49.00')
  })
})

// ---------------------------------------------------------------------------
// listProducts
// ---------------------------------------------------------------------------

describe('listProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mapped product list with pagination metadata', async () => {
    mockedRepository.findProducts.mockResolvedValue({ items: [makeProduct()], total: 1 })

    const result = await listProducts({ page: 1, limit: 20 })

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
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    })
  })

  it('passes search and storeId through to the repository', async () => {
    mockedRepository.findProducts.mockResolvedValue({ items: [], total: 0 })

    await listProducts({ page: 2, limit: 10, search: 'jacket', storeId: 'store-abc' })

    expect(mockedRepository.findProducts).toHaveBeenCalledWith({
      storeId: 'store-abc',
      search: 'jacket',
      page: 2,
      limit: 10,
    })
  })

  it('returns empty items list when no products match', async () => {
    mockedRepository.findProducts.mockResolvedValue({ items: [], total: 0 })

    const result = await listProducts({ page: 5, limit: 20 })

    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
    expect(result.page).toBe(5)
  })

  it('serializes Decimal price to string', async () => {
    const product = makeProduct({ price: { toString: () => '1234.56' } })
    mockedRepository.findProducts.mockResolvedValue({ items: [product], total: 1 })

    const result = await listProducts({ page: 1, limit: 20 })

    expect(result.items[0].price).toBe('1234.56')
  })

  it('maps null description correctly', async () => {
    mockedRepository.findProducts.mockResolvedValue({
      items: [makeProduct({ description: null })],
      total: 1,
    })

    const result = await listProducts({ page: 1, limit: 20 })

    expect(result.items[0].description).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getProduct
// ---------------------------------------------------------------------------

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

  it('serializes variant price to string when present', async () => {
    const variant = makeVariant({ price: { toString: () => '79.99' } })
    const product = { ...makeProduct(), variants: [variant] } as repository.ProductWithVariants
    mockedRepository.findProductById.mockResolvedValue(product)

    const result = await getProduct('prod-1')

    expect(result.variants[0].price).toBe('79.99')
  })

  it('throws ProductNotFoundError when product does not exist', async () => {
    mockedRepository.findProductById.mockResolvedValue(null)

    await expect(getProduct('nonexistent-id')).rejects.toThrow(ProductNotFoundError)
  })

  it('ProductNotFoundError message includes the missing id', async () => {
    mockedRepository.findProductById.mockResolvedValue(null)

    await expect(getProduct('missing-123')).rejects.toThrow('missing-123')
  })

  it('ProductNotFoundError has code NOT_FOUND', async () => {
    mockedRepository.findProductById.mockResolvedValue(null)

    await expect(getProduct('missing-id')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('returns null for optional product fields when not set', async () => {
    const product = {
      ...makeProduct({ description: null, imageUrl: null, sku: null }),
      variants: [],
    } as repository.ProductWithVariants
    mockedRepository.findProductById.mockResolvedValue(product)

    const result = await getProduct('prod-1')

    expect(result.description).toBeNull()
    expect(result.imageUrl).toBeNull()
    expect(result.sku).toBeNull()
  })
})
