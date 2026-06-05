import { beforeEach, describe, expect, it, vi } from 'vitest'
import Decimal from 'decimal.js'

vi.mock('@/features/seller/analytics/seller-analytics.repository')
vi.mock('@/features/store/store.repository')
vi.mock('@/lib/auth/guards')
vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import * as analyticsRepo from '@/features/seller/analytics/seller-analytics.repository'
import * as storeRepo from '@/features/store/store.repository'
import * as guards from '@/lib/auth/guards'
import { getMyAnalytics } from '@/features/seller/analytics/seller-analytics.service'
import type { SessionUser } from '@/features/auth/auth.dto'
import { AnalyticsAccessDeniedError } from '@/lib/errors/analytics'
import { ItemFulfillmentStatus } from '@/app/generated/prisma/client'

const mockAnalyticsRepo = vi.mocked(analyticsRepo)
const mockStoreRepo = vi.mocked(storeRepo)
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
  mockStoreRepo.findStoreByUserId.mockResolvedValue(mockStore)
  mockStoreRepo.findStoreById.mockResolvedValue(mockStore)
  mockAnalyticsRepo.getTotalRevenue.mockResolvedValue(new Decimal('1500.00'))
  mockAnalyticsRepo.getOrderCount.mockResolvedValue(42)
  mockAnalyticsRepo.getTotalProductsSold.mockResolvedValue(150)
  mockAnalyticsRepo.getTopProducts.mockResolvedValue([
    { productId: 'p1', name: 'Best Seller', totalSold: 50, revenue: '750.00' },
  ])
  mockAnalyticsRepo.getRevenueLast30Days.mockResolvedValue(new Decimal('500.00'))
  mockAnalyticsRepo.getSellerOrderItemsForRange
    .mockResolvedValueOnce([
      {
        id: 'item-1',
        orderId: 'order-1',
        quantity: 2,
        createdAt: new Date('2026-06-01T09:00:00.000Z'),
        fulfillmentStatus: ItemFulfillmentStatus.PENDING,
        productNameSnapshot: 'Best Seller',
        variantId: 'variant-1',
        unitPriceSnapshot: new Decimal('100.00'),
      },
      {
        id: 'item-2',
        orderId: 'order-2',
        quantity: 1,
        createdAt: new Date('2026-06-02T09:00:00.000Z'),
        fulfillmentStatus: ItemFulfillmentStatus.DELIVERED,
        productNameSnapshot: 'Second Seller',
        variantId: 'variant-2',
        unitPriceSnapshot: new Decimal('200.00'),
      },
    ])
    .mockResolvedValueOnce([
      {
        id: 'item-3',
        orderId: 'order-3',
        quantity: 1,
        createdAt: new Date('2026-05-30T09:00:00.000Z'),
        fulfillmentStatus: ItemFulfillmentStatus.SHIPPED,
        productNameSnapshot: 'Previous Product',
        variantId: 'variant-3',
        unitPriceSnapshot: new Decimal('100.00'),
      },
    ])
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
    mockStoreRepo.findStoreById.mockResolvedValue({
      ...mockStore,
      ownerId: 'another-user',
    })

    await expect(
      getMyAnalytics(mockUser, {
        range: '7d',
        storeId: 'c46a7467-f07e-4052-869c-42079a8e9dc0',
      }),
    ).rejects.toThrow(AnalyticsAccessDeniedError)
  })

  it('returns valid zero analytics for an empty dataset', async () => {
    mockAnalyticsRepo.getSellerOrderItemsForRange.mockReset()
    mockAnalyticsRepo.getSellerOrderItemsForRange.mockResolvedValue([])
    mockAnalyticsRepo.getSellerRefundMetricsForRange.mockResolvedValue({
      refundCount: 0,
      refundAmount: new Decimal(0),
    })
    mockAnalyticsRepo.getSellerDisputeCountForRange.mockResolvedValue(0)
    mockAnalyticsRepo.getSellerBalanceSnapshot.mockResolvedValue(null)

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
