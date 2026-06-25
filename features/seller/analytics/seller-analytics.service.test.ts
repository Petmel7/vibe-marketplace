import { beforeEach, describe, expect, it, vi } from 'vitest'
import Decimal from 'decimal.js'

vi.mock('@/features/seller/analytics/seller-analytics.repository')
vi.mock('@/features/store/store.repository')
vi.mock('@/features/store/store.service')
vi.mock('@/lib/auth/guards')
vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import * as analyticsRepo from '@/features/seller/analytics/seller-analytics.repository'
import * as storeRepo from '@/features/store/store.repository'
import * as storeService from '@/features/store/store.service'
import * as guards from '@/lib/auth/guards'
import {
  getMyAnalytics,
  getMyOverviewAnalytics,
} from '@/features/seller/analytics/seller-analytics.service'
import type { SessionUser } from '@/features/auth/auth.dto'
import { AnalyticsAccessDeniedError } from '@/lib/errors/analytics'

const mockAnalyticsRepo = vi.mocked(analyticsRepo)
const mockStoreRepo = vi.mocked(storeRepo)
const mockStoreService = vi.mocked(storeService)
const mockGuards = vi.mocked(guards)

const mockUser: SessionUser = {
  id: 'user-uuid-001',
  email: 'seller@example.com',
  roles: ['SELLER' as never],
}

const mockStore = {
  id: 'store-uuid-001',
  ownerId: 'user-uuid-001',
  name: 'Test Store',
  slug: 'test-store',
  description: null,
  logoUrl: null,
  bannerUrl: null,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGuards.requireSeller.mockReturnValue(undefined)
  mockStoreRepo.listStoresByOwnerId.mockResolvedValue([mockStore] as never)
  mockStoreService.assertStoreOwnership.mockResolvedValue(mockStore as never)
  mockAnalyticsRepo.getTotalRevenue.mockResolvedValue(new Decimal('1500.00'))
  mockAnalyticsRepo.getOrderCount.mockResolvedValue(42)
  mockAnalyticsRepo.getTotalProductsSold.mockResolvedValue(150)
  mockAnalyticsRepo.getRevenueLast30Days.mockResolvedValue(new Decimal('500.00'))
  mockAnalyticsRepo.getSellerRangeMetrics
    .mockResolvedValueOnce({
      revenueTotal: new Decimal('400.00'),
      ordersTotal: 2,
      unitsSold: 3,
      pendingFulfillmentCount: 1,
      shippedFulfillmentCount: 0,
      deliveredFulfillmentCount: 1,
    })
    .mockResolvedValueOnce({
      revenueTotal: new Decimal('100.00'),
      ordersTotal: 1,
      unitsSold: 1,
      pendingFulfillmentCount: 0,
      shippedFulfillmentCount: 1,
      deliveredFulfillmentCount: 0,
    })
  mockAnalyticsRepo.getSellerRefundMetricsForRange.mockResolvedValue({
    refundCount: 2,
    refundAmount: new Decimal('50.00'),
  })
  mockAnalyticsRepo.getSellerDisputeCountForRange.mockResolvedValue(3)
  mockAnalyticsRepo.getSellerBalanceSnapshot.mockResolvedValue({
    availableAmount: new Decimal('250.00'),
    pendingAmount: new Decimal('80.00'),
    paidOutAmount: new Decimal('900.00'),
  })
  mockAnalyticsRepo.getSellerRevenueSeriesForRange.mockResolvedValue([
    { bucket: new Date('2026-06-01T00:00:00.000Z'), value: new Decimal('200.00') },
    { bucket: new Date('2026-06-02T00:00:00.000Z'), value: new Decimal('200.00') },
  ])
  mockAnalyticsRepo.getSellerOrderSeriesForRange.mockResolvedValue([
    { bucket: new Date('2026-06-01T00:00:00.000Z'), value: new Decimal(1) },
    { bucket: new Date('2026-06-02T00:00:00.000Z'), value: new Decimal(1) },
  ])
  mockAnalyticsRepo.getSellerFulfillmentSeriesForRange.mockResolvedValue([
    {
      bucket: new Date('2026-06-01T00:00:00.000Z'),
      value: new Decimal(1),
      secondaryValue: new Decimal(0),
    },
    {
      bucket: new Date('2026-06-02T00:00:00.000Z'),
      value: new Decimal(1),
      secondaryValue: new Decimal(1),
    },
  ])
  mockAnalyticsRepo.getSellerTopProductsForRange.mockResolvedValue([
    { productId: 'variant-1', name: 'Best Seller', totalSold: 2, revenue: '200.00' },
    { productId: 'variant-2', name: 'Second Seller', totalSold: 1, revenue: '200.00' },
  ])
})

describe('getMyAnalytics', () => {
  it('returns seller analytics v2 with legacy keys intact', async () => {
    const result = await getMyAnalytics(mockUser, {
      range: 'custom',
      from: '2026-06-01',
      to: '2026-06-03',
      interval: 'day',
    })

    expect(result).toHaveProperty('totalRevenue')
    expect(result).toHaveProperty('totalOrders')
    expect(result).toHaveProperty('totalProductsSold')
    expect(result).toHaveProperty('topProducts')
    expect(result).toHaveProperty('revenueLast30Days')
    expect(result).toHaveProperty('revenueSeries')
    expect(result).toHaveProperty('orderSeries')
    expect(result).toHaveProperty('availableBalance')
  })

  it('serializes Decimal-based analytics fields as strings', async () => {
    const result = await getMyAnalytics(mockUser, {
      range: 'custom',
      from: '2026-06-01',
      to: '2026-06-03',
      interval: 'day',
    })

    expect(result.totalRevenue).toBe('1500.00')
    expect(result.revenueLast30Days).toBe('500.00')
    expect(result.revenueTotal).toBe('400.00')
    expect(result.revenuePreviousPeriod).toBe('100.00')
    expect(result.averageOrderValue).toBe('200.00')
    expect(result.refundAmount).toBe('50.00')
    expect(result.availableBalance).toBe('250.00')
  })

  it('zero-fills missing time-series buckets', async () => {
    const result = await getMyAnalytics(mockUser, {
      range: 'custom',
      from: '2026-06-01',
      to: '2026-06-03',
      interval: 'day',
    })

    expect(result.revenueSeries).toEqual([
      { date: '2026-06-01', label: '2026-06-01', value: '200.00' },
      { date: '2026-06-02', label: '2026-06-02', value: '200.00' },
      { date: '2026-06-03', label: '2026-06-03', value: '0.00' },
    ])
    expect(result.orderSeries[2].value).toBe(0)
  })

  it('lets a seller access only own store analytics', async () => {
    mockStoreService.assertStoreOwnership.mockRejectedValue(
      new AnalyticsAccessDeniedError('You do not have access to this store analytics'),
    )

    await expect(
      getMyAnalytics(mockUser, {
        range: '7d',
        storeId: 'c46a7467-f07e-4052-869c-42079a8e9dc0',
      }),
    ).rejects.toThrow(AnalyticsAccessDeniedError)
  })

  it('aggregates analytics across all owned stores when storeId is omitted', async () => {
    mockStoreRepo.listStoresByOwnerId.mockResolvedValue([
      mockStore,
      { ...mockStore, id: 'store-uuid-002', slug: 'second-store' },
    ] as never)

    await getMyAnalytics(mockUser, {
      range: '7d',
      interval: 'day',
    })

    expect(mockAnalyticsRepo.getTotalRevenue).toHaveBeenCalledWith([
      'store-uuid-001',
      'store-uuid-002',
    ])
    expect(mockAnalyticsRepo.getSellerBalanceSnapshot).toHaveBeenCalledWith([
      'store-uuid-001',
      'store-uuid-002',
    ])
  })

  it('returns valid zero analytics for an empty dataset', async () => {
    mockAnalyticsRepo.getSellerRangeMetrics.mockReset()
    mockAnalyticsRepo.getSellerRangeMetrics.mockResolvedValue({
      revenueTotal: new Decimal(0),
      ordersTotal: 0,
      unitsSold: 0,
      pendingFulfillmentCount: 0,
      shippedFulfillmentCount: 0,
      deliveredFulfillmentCount: 0,
    })
    mockAnalyticsRepo.getSellerRefundMetricsForRange.mockResolvedValue({
      refundCount: 0,
      refundAmount: new Decimal(0),
    })
    mockAnalyticsRepo.getSellerDisputeCountForRange.mockResolvedValue(0)
    mockAnalyticsRepo.getSellerBalanceSnapshot.mockResolvedValue(null)
    mockAnalyticsRepo.getSellerRevenueSeriesForRange.mockResolvedValue([])
    mockAnalyticsRepo.getSellerOrderSeriesForRange.mockResolvedValue([])
    mockAnalyticsRepo.getSellerFulfillmentSeriesForRange.mockResolvedValue([])
    mockAnalyticsRepo.getSellerTopProductsForRange.mockResolvedValue([])

    const result = await getMyAnalytics(mockUser, {
      range: 'custom',
      from: '2026-06-01',
      to: '2026-06-02',
      interval: 'day',
    })

    expect(result.ordersTotal).toBe(0)
    expect(result.revenueTotal).toBe('0.00')
    expect(result.revenueGrowthPercent).toBe(0)
    expect(result.availableBalance).toBe('0.00')
    expect(result.revenueSeries).toEqual([
      { date: '2026-06-01', label: '2026-06-01', value: '0.00' },
      { date: '2026-06-02', label: '2026-06-02', value: '0.00' },
    ])
  })
})

describe('getMyOverviewAnalytics', () => {
  it('returns lightweight seller overview analytics without series-heavy calls', async () => {
    const result = await getMyOverviewAnalytics(mockUser)

    expect(result.totalRevenue).toBe('1500.00')
    expect(result.totalOrders).toBe(42)
    expect(result.totalProductsSold).toBe(150)
    expect(result.revenueLast30Days).toBe('500.00')
    expect(result.topProducts).toHaveLength(2)
    expect(mockAnalyticsRepo.getSellerRangeMetrics).not.toHaveBeenCalled()
    expect(mockAnalyticsRepo.getSellerRevenueSeriesForRange).not.toHaveBeenCalled()
    expect(mockAnalyticsRepo.getSellerOrderSeriesForRange).not.toHaveBeenCalled()
    expect(mockAnalyticsRepo.getSellerFulfillmentSeriesForRange).not.toHaveBeenCalled()
    expect(mockAnalyticsRepo.getSellerRefundMetricsForRange).not.toHaveBeenCalled()
    expect(mockAnalyticsRepo.getSellerDisputeCountForRange).not.toHaveBeenCalled()
    expect(mockAnalyticsRepo.getSellerBalanceSnapshot).not.toHaveBeenCalled()
  })
})
