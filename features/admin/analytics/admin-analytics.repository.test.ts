import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  queryRawMock,
  orderCountMock,
  sellerProfileCountMock,
  buyerProfileCountMock,
  productCountMock,
  riskProfileGroupByMock,
} = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
  orderCountMock: vi.fn(),
  sellerProfileCountMock: vi.fn(),
  buyerProfileCountMock: vi.fn(),
  productCountMock: vi.fn(),
  riskProfileGroupByMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: queryRawMock,
    order: {
      count: orderCountMock,
      aggregate: vi.fn(),
    },
    sellerProfile: {
      count: sellerProfileCountMock,
    },
    buyerProfile: {
      count: buyerProfileCountMock,
    },
    product: {
      count: productCountMock,
    },
    riskProfile: {
      groupBy: riskProfileGroupByMock,
    },
  },
}))

import {
  getAdminOrderMetricsForRange,
  getAdminTopSellersForRange,
} from './admin-analytics.repository'

describe('admin analytics repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps DB aggregate order metrics into admin KPI metrics', async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        gmv: { toString: () => '420.00' },
        ordersTotal: 2,
        paidOrders: 2,
        codOrders: 1,
        failedPayments: 0,
      },
    ])

    const result = await getAdminOrderMetricsForRange(
      new Date('2026-06-01T00:00:00.000Z'),
      new Date('2026-06-03T23:59:59.999Z'),
    )

    expect(result.gmv.toFixed(2)).toBe('420.00')
    expect(result.ordersTotal).toBe(2)
    expect(result.codOrders).toBe(1)
  })

  it('maps top sellers from grouped DB rows', async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        sellerId: 'seller-1',
        storeId: 'store-1',
        storeName: 'Fashion Store',
        revenue: { toString: () => '900.00' },
        orderCount: 5,
      },
    ])

    const result = await getAdminTopSellersForRange(
      new Date('2026-06-01T00:00:00.000Z'),
      new Date('2026-06-03T23:59:59.999Z'),
      10,
    )

    expect(result).toEqual([
      {
        sellerId: 'seller-1',
        storeId: 'store-1',
        storeName: 'Fashion Store',
        revenue: '900.00',
        orderCount: 5,
      },
    ])
  })
})
