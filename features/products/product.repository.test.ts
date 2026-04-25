import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '@/app/generated/prisma/client'

const { findManyMock, countMock, queryRawMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  countMock: vi.fn(),
  queryRawMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: findManyMock,
      count: countMock,
    },
    $queryRaw: queryRawMock,
  },
}))

import { findProducts } from './product.repository'

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

describe('findProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses page-based pagination with stable sorting', async () => {
    findManyMock.mockResolvedValue([makeProduct()])
    countMock.mockResolvedValue(25)

    const result = await findProducts({ page: 2, limit: 12 })

    expect(findManyMock).toHaveBeenCalledWith({
      where: { isActive: true },
      skip: 12,
      take: 12,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
    expect(countMock).toHaveBeenCalledWith({
      where: { isActive: true },
    })
    expect(result.total).toBe(25)
  })

  it('applies isNew filter to findMany and count', async () => {
    findManyMock.mockResolvedValue([])
    countMock.mockResolvedValue(0)

    await findProducts({ page: 1, limit: 12, isNew: true })

    expect(findManyMock).toHaveBeenCalledWith({
      where: { isActive: true, isNew: true },
      skip: 0,
      take: 12,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
    expect(countMock).toHaveBeenCalledWith({
      where: { isActive: true, isNew: true },
    })
  })

  it('applies isHit filter to findMany and count', async () => {
    findManyMock.mockResolvedValue([])
    countMock.mockResolvedValue(0)

    await findProducts({ page: 1, limit: 12, isHit: true })

    expect(findManyMock).toHaveBeenCalledWith({
      where: { isActive: true, isHit: true },
      skip: 0,
      take: 12,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
    expect(countMock).toHaveBeenCalledWith({
      where: { isActive: true, isHit: true },
    })
  })
})
