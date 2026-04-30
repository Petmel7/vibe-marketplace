import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '@/app/generated/prisma/client'

const {
  findManyMock,
  countMock,
  queryRawMock,
  categoryFindFirstMock,
  categoryFindManyMock,
  variantFindManyMock,
} = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  countMock: vi.fn(),
  queryRawMock: vi.fn(),
  categoryFindFirstMock: vi.fn(),
  categoryFindManyMock: vi.fn(),
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
    category: {
      findFirst: categoryFindFirstMock,
      findMany: categoryFindManyMock,
    },
    $queryRaw: queryRawMock,
  },
}))

import {
  findCategoriesByParentIds,
  findCategoryBySlug,
  findProducts,
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
      include: {
        variants: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
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
