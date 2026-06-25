import { beforeEach, describe, expect, it, vi } from 'vitest'
import Decimal from 'decimal.js'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/admin/analytics/admin-analytics.repository')
vi.mock('@/lib/auth/adminGuards')

import * as repo from '@/features/admin/analytics/admin-analytics.repository'
import * as adminGuards from '@/lib/auth/adminGuards'
import {
  getMarketplaceAnalytics,
  getMarketplaceOverviewAnalytics,
} from '@/features/admin/analytics/admin-analytics.service'
import { AdminAccessError } from '@/lib/errors/admin'
import type { SessionUser } from '@/features/auth/auth.dto'

const mockRepo = vi.mocked(repo)
const mockGuards = vi.mocked(adminGuards)

const mockAdmin: SessionUser = { id: 'admin-uuid-0001', email: 'admin@test.com', roles: [] }
const mockNonAdmin: SessionUser = { id: 'user-uuid-001', email: 'buyer@test.com', roles: [] }

function setupRepoMocks() {
  mockRepo.getGMV.mockResolvedValue(new Decimal('125000.00'))
  mockRepo.getTotalOrderCount.mockResolvedValue(450)
  mockRepo.getTotalSellerCount.mockResolvedValue(80)
  mockRepo.getTotalBuyerCount.mockResolvedValue(1200)
  mockRepo.getTotalProductCount.mockResolvedValue(3400)
  mockRepo.getSellerGrowthLast30Days.mockResolvedValue(12)
  mockRepo.getOrderGrowthLast30Days.mockResolvedValue(75)
  mockRepo.getModerationStats.mockResolvedValue({
    pendingSellerApprovals: 5,
    pendingProductApprovals: 20,
    suspendedSellers: 2,
    rejectedProducts: 8,
  })
  mockRepo.getAdminOrderMetricsForRange
    .mockResolvedValueOnce({
      gmv: new Decimal('420.00'),
      ordersTotal: 2,
      paidOrders: 2,
      codOrders: 1,
      failedPayments: 0,
    })
    .mockResolvedValueOnce({
      gmv: new Decimal('100.00'),
      ordersTotal: 1,
      paidOrders: 1,
      codOrders: 0,
      failedPayments: 0,
    })
  mockRepo.getAdminCommissionMetricsForRange.mockResolvedValue({
    commissionRevenue: new Decimal('42.00'),
    netSellerRevenue: new Decimal('378.00'),
  })
  mockRepo.getAdminRefundMetricsForRange.mockResolvedValue({
    refundCount: 1,
    refundAmount: new Decimal('30.00'),
  })
  mockRepo.getAdminDisputeCountForRange.mockResolvedValue(1)
  mockRepo.getSellerGrowthCountForRange
    .mockResolvedValueOnce(2)
    .mockResolvedValueOnce(1)
  mockRepo.getActiveSellerCount.mockResolvedValue(54)
  mockRepo.getPublishedProductCount.mockResolvedValue(2500)
  mockRepo.getRiskSummary.mockResolvedValue({
    low: 10,
    medium: 5,
    high: 2,
    critical: 1,
  })
  mockRepo.getAdminTopSellersForRange.mockResolvedValue([
    {
      sellerId: 'seller-001',
      storeId: 'store-001',
      storeName: 'Fashion Store',
      revenue: '200.00',
      orderCount: 1,
    },
    {
      sellerId: 'seller-002',
      storeId: 'store-002',
      storeName: 'Urban Store',
      revenue: '120.00',
      orderCount: 1,
    },
  ])
  mockRepo.getAdminTopProductsForRange.mockResolvedValue([
    {
      productId: 'variant-001',
      name: 'Blue Jeans',
      totalSold: 2,
      revenue: '200.00',
    },
    {
      productId: 'variant-002',
      name: 'White Shirt',
      totalSold: 1,
      revenue: '120.00',
    },
  ])
  mockRepo.getAdminTopCategoriesForRange.mockResolvedValue([
    {
      categoryId: 'cat-1',
      name: 'Denim',
      totalSold: 2,
      revenue: '200.00',
    },
    {
      categoryId: 'cat-2',
      name: 'Shirts',
      totalSold: 1,
      revenue: '120.00',
    },
  ])
  mockRepo.getAdminRevenueSeriesForRange.mockResolvedValue([
    { bucket: new Date('2026-06-01T00:00:00.000Z'), value: new Decimal('200.00') },
    { bucket: new Date('2026-06-02T00:00:00.000Z'), value: new Decimal('120.00') },
  ])
  mockRepo.getAdminOrderSeriesForRange.mockResolvedValue([
    { bucket: new Date('2026-06-01T00:00:00.000Z'), value: new Decimal(1) },
    { bucket: new Date('2026-06-02T00:00:00.000Z'), value: new Decimal(1) },
  ])
  mockRepo.getAdminSellerGrowthSeriesForRange.mockResolvedValue([
    { bucket: new Date('2026-06-01T00:00:00.000Z'), value: new Decimal(1) },
    { bucket: new Date('2026-06-02T00:00:00.000Z'), value: new Decimal(1) },
  ])
  mockRepo.getAdminRefundSeriesForRange.mockResolvedValue([
    {
      bucket: new Date('2026-06-02T00:00:00.000Z'),
      value: new Decimal(1),
      secondaryValue: new Decimal('30.00'),
    },
  ])
  mockRepo.getAdminDisputeSeriesForRange.mockResolvedValue([
    { bucket: new Date('2026-06-03T00:00:00.000Z'), value: new Decimal(1) },
  ])
  mockRepo.getAdminCommissionSeriesForRange.mockResolvedValue([
    { bucket: new Date('2026-06-01T00:00:00.000Z'), value: new Decimal('42.00') },
  ])
}

beforeEach(() => {
  vi.resetAllMocks()
  mockGuards.assertAdminAccess.mockReturnValue(undefined)
  mockGuards.assertNotSelfModeration.mockReturnValue(undefined)
})

describe('getMarketplaceAnalytics', () => {
  it('returns marketplace analytics v2 with KPI, risk, and series fields', async () => {
    setupRepoMocks()

    const result = await getMarketplaceAnalytics(mockAdmin, {
      range: 'custom',
      from: '2026-06-01',
      to: '2026-06-03',
      interval: 'day',
    })

    expect(result.gmvPreviousPeriod).toBe('100.00')
    expect(result.commissionRevenue).toBe('42.00')
    expect(result.ordersTotal).toBe(2)
    expect(result.failedPayments).toBe(0)
    expect(result.refundCount).toBe(1)
    expect(result.refundAmount).toBe('30.00')
    expect(result.disputeCount).toBe(1)
    expect(result.riskSummary.critical).toBe(1)
    expect(result.topSellers[0].storeId).toBe('store-001')
    expect(result.topCategories).toHaveLength(2)
    expect(result.revenueSeries).toHaveLength(3)
    expect(result.commissionSeries[0].value).toBe('42.00')
  })

  it('serializes Decimal values as strings', async () => {
    setupRepoMocks()

    const result = await getMarketplaceAnalytics(mockAdmin, {
      range: 'custom',
      from: '2026-06-01',
      to: '2026-06-03',
      interval: 'day',
    })

    expect(typeof result.gmv).toBe('string')
    expect(typeof result.topSellers[0].revenue).toBe('string')
    expect(typeof result.topProducts[0].revenue).toBe('string')
    expect(typeof result.commissionRevenue).toBe('string')
    expect(typeof result.refundAmount).toBe('string')
  })

  it('returns valid zero analytics for an empty dataset', async () => {
    setupRepoMocks()
    mockRepo.getAdminOrderMetricsForRange.mockReset()
    mockRepo.getAdminOrderMetricsForRange.mockResolvedValue({
      gmv: new Decimal(0),
      ordersTotal: 0,
      paidOrders: 0,
      codOrders: 0,
      failedPayments: 0,
    })
    mockRepo.getAdminCommissionMetricsForRange.mockResolvedValue({
      commissionRevenue: new Decimal(0),
      netSellerRevenue: new Decimal(0),
    })
    mockRepo.getAdminRefundMetricsForRange.mockResolvedValue({
      refundCount: 0,
      refundAmount: new Decimal(0),
    })
    mockRepo.getAdminDisputeCountForRange.mockResolvedValue(0)
    mockRepo.getSellerGrowthCountForRange.mockReset()
    mockRepo.getSellerGrowthCountForRange.mockResolvedValue(0)
    mockRepo.getAdminTopSellersForRange.mockResolvedValue([])
    mockRepo.getAdminTopProductsForRange.mockResolvedValue([])
    mockRepo.getAdminTopCategoriesForRange.mockResolvedValue([])
    mockRepo.getAdminRevenueSeriesForRange.mockResolvedValue([])
    mockRepo.getAdminOrderSeriesForRange.mockResolvedValue([])
    mockRepo.getAdminSellerGrowthSeriesForRange.mockResolvedValue([])
    mockRepo.getAdminRefundSeriesForRange.mockResolvedValue([])
    mockRepo.getAdminDisputeSeriesForRange.mockResolvedValue([])
    mockRepo.getAdminCommissionSeriesForRange.mockResolvedValue([])

    const result = await getMarketplaceAnalytics(mockAdmin, {
      range: 'custom',
      from: '2026-06-01',
      to: '2026-06-02',
      interval: 'day',
    })

    expect(result.ordersTotal).toBe(0)
    expect(result.gmvGrowthPercent).toBe(0)
    expect(result.refundAmount).toBe('0.00')
    expect(result.revenueSeries).toEqual([
      { date: '2026-06-01', label: '2026-06-01', value: '0.00' },
      { date: '2026-06-02', label: '2026-06-02', value: '0.00' },
    ])
  })

  it('throws AdminAccessError on non-admin user', async () => {
    mockGuards.assertAdminAccess.mockImplementation((user) => {
      if (!user.roles.includes('ADMIN' as import('@/app/generated/prisma/client').UserRole)) {
        throw new AdminAccessError()
      }
    })

    await expect(getMarketplaceAnalytics(mockNonAdmin, { range: '7d' })).rejects.toThrow(
      AdminAccessError,
    )

    expect(mockRepo.getGMV).not.toHaveBeenCalled()
  })

  it('retries once when a transient ECONNRESET occurs during aggregation', async () => {
    setupRepoMocks()
    mockRepo.getPublishedProductCount
      .mockRejectedValueOnce(new Error('read ECONNRESET'))
      .mockResolvedValueOnce(2500)

    const result = await getMarketplaceAnalytics(mockAdmin, {
      range: 'custom',
      from: '2026-06-01',
      to: '2026-06-03',
      interval: 'day',
    })

    expect(result.publishedProductCount).toBe(2500)
    expect(mockRepo.getPublishedProductCount).toHaveBeenCalledTimes(2)
  })
})

describe('getMarketplaceOverviewAnalytics', () => {
  it('returns lightweight admin overview analytics without series-heavy calls', async () => {
    setupRepoMocks()

    const result = await getMarketplaceOverviewAnalytics(mockAdmin)

    expect(result.gmv).toBe('125000')
    expect(result.totalOrders).toBe(450)
    expect(result.topSellers).toHaveLength(2)
    expect(result.topProducts).toHaveLength(2)
    expect(mockRepo.getAdminRevenueSeriesForRange).not.toHaveBeenCalled()
    expect(mockRepo.getAdminOrderSeriesForRange).not.toHaveBeenCalled()
    expect(mockRepo.getAdminRefundSeriesForRange).not.toHaveBeenCalled()
    expect(mockRepo.getAdminDisputeSeriesForRange).not.toHaveBeenCalled()
    expect(mockRepo.getAdminCommissionSeriesForRange).not.toHaveBeenCalled()
    expect(mockRepo.getAdminTopCategoriesForRange).not.toHaveBeenCalled()
    expect(mockRepo.getRiskSummary).not.toHaveBeenCalled()
  })
})
