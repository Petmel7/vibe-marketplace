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
  getAdminTopProductsForRange,
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

    const sqlText = queryRawMock.mock.calls[0]?.[0]?.strings.join(' ')

    expect(sqlText).toContain('oi.store_id::text AS "storeId"')
    expect(sqlText).toContain('s.name::text AS "storeName"')
    expect(sqlText).toContain('GROUP BY oi.store_id, s.owner_id, s.name')
    expect(sqlText).not.toContain('MIN(oi.store_id)')
    expect(sqlText).not.toContain('MAX(oi.store_id)')
  })

  it('maps top products from grouped DB rows', async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        productId: 'variant-1',
        name: 'Oversized Hoodie',
        totalSold: 7,
        revenue: { toString: () => '2100.00' },
      },
    ])

    const result = await getAdminTopProductsForRange(
      new Date('2026-06-01T00:00:00.000Z'),
      new Date('2026-06-03T23:59:59.999Z'),
      10,
    )

    expect(result).toEqual([
      {
        productId: 'variant-1',
        name: 'Oversized Hoodie',
        totalSold: 7,
        revenue: '2100.00',
      },
    ])

    const sqlText = queryRawMock.mock.calls[0]?.[0]?.strings.join(' ')

    expect(sqlText).toContain('oi.variant_id::text AS "productId"')
    expect(sqlText).toContain('GROUP BY oi.variant_id, oi.product_name_snapshot')
    expect(sqlText).not.toContain('MIN(oi.variant_id)')
    expect(sqlText).not.toContain('MAX(oi.variant_id)')
  })
})
