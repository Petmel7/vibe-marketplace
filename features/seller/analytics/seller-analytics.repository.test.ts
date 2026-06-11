import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  queryRawMock,
  orderItemAggregateMock,
  refundRequestCountMock,
  refundRequestAggregateMock,
  disputeCountMock,
  sellerBalanceFindUniqueMock,
} = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
  orderItemAggregateMock: vi.fn(),
  refundRequestCountMock: vi.fn(),
  refundRequestAggregateMock: vi.fn(),
  disputeCountMock: vi.fn(),
  sellerBalanceFindUniqueMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: queryRawMock,
    orderItem: {
      aggregate: orderItemAggregateMock,
    },
    refundRequest: {
      count: refundRequestCountMock,
      aggregate: refundRequestAggregateMock,
    },
    dispute: {
      count: disputeCountMock,
    },
    sellerBalance: {
      findUnique: sellerBalanceFindUniqueMock,
    },
  },
}))

import {
  getSellerRangeMetrics,
  getSellerRevenueSeriesForRange,
  getSellerTopProductsForRange,
} from './seller-analytics.repository'

describe('seller analytics repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps DB aggregate range metrics into typed seller metrics', async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        revenueTotal: { toString: () => '450.00' },
        ordersTotal: 3,
        unitsSold: 7,
        pendingFulfillmentCount: 2,
        shippedFulfillmentCount: 1,
        deliveredFulfillmentCount: 1,
      },
    ])

    const result = await getSellerRangeMetrics(
      ['store-1'],
      new Date('2026-06-01T00:00:00.000Z'),
      new Date('2026-06-03T23:59:59.999Z'),
    )

    expect(result.revenueTotal.toFixed(2)).toBe('450.00')
    expect(result.ordersTotal).toBe(3)
    expect(result.unitsSold).toBe(7)
    expect(result.pendingFulfillmentCount).toBe(2)
  })

  it('maps revenue series rows from DB aggregation', async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        bucket: new Date('2026-06-01T00:00:00.000Z'),
        value: { toString: () => '200.00' },
      },
      {
        bucket: new Date('2026-06-02T00:00:00.000Z'),
        value: { toString: () => '150.00' },
      },
    ])

    const result = await getSellerRevenueSeriesForRange(
      ['store-1'],
      new Date('2026-06-01T00:00:00.000Z'),
      new Date('2026-06-03T23:59:59.999Z'),
      'day',
    )

    expect(result).toEqual([
      expect.objectContaining({ value: expect.objectContaining({ toFixed: expect.any(Function) }) }),
      expect.objectContaining({ value: expect.objectContaining({ toFixed: expect.any(Function) }) }),
    ])
    expect(result[0]?.value.toFixed(2)).toBe('200.00')
    expect(result[1]?.value.toFixed(2)).toBe('150.00')
  })

  it('maps top products from grouped DB rows', async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        productId: 'variant-1',
        name: 'Blue Jeans',
        totalSold: 4,
        revenue: { toString: () => '400.00' },
      },
    ])

    const result = await getSellerTopProductsForRange(
      ['store-1'],
      new Date('2026-06-01T00:00:00.000Z'),
      new Date('2026-06-03T23:59:59.999Z'),
      10,
    )

    expect(result).toEqual([
      {
        productId: 'variant-1',
        name: 'Blue Jeans',
        totalSold: 4,
        revenue: '400.00',
      },
    ])
  })
})
