import { beforeEach, describe, expect, it, vi } from 'vitest'
import Decimal from 'decimal.js'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/admin/analytics/admin-analytics.repository')
vi.mock('@/lib/auth/adminGuards')

import * as repo from '@/features/admin/analytics/admin-analytics.repository'
import * as adminGuards from '@/lib/auth/adminGuards'
import { getMarketplaceAnalytics } from '@/features/admin/analytics/admin-analytics.service'
import { AdminAccessError } from '@/lib/errors/admin'
import type { SessionUser } from '@/features/auth/auth.dto'
import { PaymentMethod, PaymentStatus, RefundRequestStatus } from '@/app/generated/prisma/client'

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
  mockRepo.getTopSellers.mockResolvedValue([
    {
      sellerId: 'seller-001',
      storeId: 'store-001',
      storeName: 'Fashion Store',
      revenue: new Decimal('25000.00'),
      orderCount: 100,
    },
  ])
  mockRepo.getTopProducts.mockResolvedValue([
    {
      productId: 'variant-001',
      name: 'Blue Jeans',
      totalSold: 50,
      revenue: new Decimal('2500.00'),
    },
  ])
  mockRepo.getSellerGrowthLast30Days.mockResolvedValue(12)
  mockRepo.getOrderGrowthLast30Days.mockResolvedValue(75)
  mockRepo.getModerationStats.mockResolvedValue({
    pendingSellerApprovals: 5,
    pendingProductApprovals: 20,
    suspendedSellers: 2,
    rejectedProducts: 8,
  })
  mockRepo.getOrdersForRange
    .mockResolvedValueOnce([
      {
        id: 'order-1',
        createdAt: new Date('2026-06-01T12:00:00.000Z'),
        totalAmount: new Decimal('300.00'),
        status: 'paid',
        payments: [{ method: PaymentMethod.CARD, status: PaymentStatus.SUCCEEDED }],
      },
      {
        id: 'order-2',
        createdAt: new Date('2026-06-02T12:00:00.000Z'),
        totalAmount: new Decimal('120.00'),
        status: 'confirmed',
        payments: [{ method: PaymentMethod.CASH_ON_DELIVERY, status: PaymentStatus.PENDING }],
      },
    ])
    .mockResolvedValueOnce([
      {
        id: 'order-previous',
        createdAt: new Date('2026-05-30T12:00:00.000Z'),
        totalAmount: new Decimal('100.00'),
        status: 'paid',
        payments: [{ method: PaymentMethod.CARD, status: PaymentStatus.SUCCEEDED }],
      },
    ])
  mockRepo.getOrderItemsForRange
    .mockResolvedValueOnce([
      {
        orderId: 'order-1',
        createdAt: new Date('2026-06-01T12:00:00.000Z'),
        quantity: 2,
        unitPriceSnapshot: new Decimal('100.00'),
        productNameSnapshot: 'Blue Jeans',
        variantId: 'variant-001',
        storeId: 'store-001',
        store: { name: 'Fashion Store', ownerId: 'seller-001' },
        variant: { product: { category: { id: 'cat-1', name: 'Denim' } } },
      },
      {
        orderId: 'order-2',
        createdAt: new Date('2026-06-02T12:00:00.000Z'),
        quantity: 1,
        unitPriceSnapshot: new Decimal('120.00'),
        productNameSnapshot: 'White Shirt',
        variantId: 'variant-002',
        storeId: 'store-002',
        store: { name: 'Urban Store', ownerId: 'seller-002' },
        variant: { product: { category: { id: 'cat-2', name: 'Shirts' } } },
      },
    ])
    .mockResolvedValueOnce([
      {
        orderId: 'order-previous',
        createdAt: new Date('2026-05-30T12:00:00.000Z'),
        quantity: 1,
        unitPriceSnapshot: new Decimal('100.00'),
        productNameSnapshot: 'Previous Product',
        variantId: 'variant-003',
        storeId: 'store-001',
        store: { name: 'Fashion Store', ownerId: 'seller-001' },
        variant: { product: { category: { id: 'cat-1', name: 'Denim' } } },
      },
    ])
  mockRepo.getCommissionRowsForRange.mockResolvedValue([
    {
      createdAt: new Date('2026-06-01T12:00:00.000Z'),
      commissionAmount: new Decimal('42.00'),
      sellerNetAmount: new Decimal('378.00'),
    },
  ])
  mockRepo.getRefundRowsForRange.mockResolvedValue([
    {
      createdAt: new Date('2026-06-02T12:00:00.000Z'),
      amount: new Decimal('30.00'),
      status: RefundRequestStatus.SUCCEEDED,
    },
  ])
  mockRepo.getDisputeRowsForRange.mockResolvedValue([{ createdAt: new Date('2026-06-03T12:00:00.000Z') }])
  mockRepo.getSellerGrowthRowsForRange
    .mockResolvedValueOnce([
      { createdAt: new Date('2026-06-01T12:00:00.000Z') },
      { createdAt: new Date('2026-06-02T12:00:00.000Z') },
    ])
    .mockResolvedValueOnce([{ createdAt: new Date('2026-05-30T12:00:00.000Z') }])
  mockRepo.getActiveSellerCount.mockResolvedValue(54)
  mockRepo.getPublishedProductCount.mockResolvedValue(2500)
  mockRepo.getRiskSummary.mockResolvedValue({
    low: 10,
    medium: 5,
    high: 2,
    critical: 1,
  })
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
    mockRepo.getOrdersForRange.mockReset()
    mockRepo.getOrdersForRange.mockResolvedValue([])
    mockRepo.getOrderItemsForRange.mockReset()
    mockRepo.getOrderItemsForRange.mockResolvedValue([])
    mockRepo.getCommissionRowsForRange.mockResolvedValue([])
    mockRepo.getRefundRowsForRange.mockResolvedValue([])
    mockRepo.getDisputeRowsForRange.mockResolvedValue([])
    mockRepo.getSellerGrowthRowsForRange.mockReset()
    mockRepo.getSellerGrowthRowsForRange.mockResolvedValue([])

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
})
