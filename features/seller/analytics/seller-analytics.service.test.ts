import { describe, it, expect, vi, beforeEach } from 'vitest'
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
  mockAnalyticsRepo.getTotalRevenue.mockResolvedValue(new Decimal('1500.00'))
  mockAnalyticsRepo.getOrderCount.mockResolvedValue(42)
  mockAnalyticsRepo.getTotalProductsSold.mockResolvedValue(150)
  mockAnalyticsRepo.getTopProducts.mockResolvedValue([
    { productId: 'p1', name: 'Best Seller', totalSold: 50, revenue: '750.00' },
  ])
  mockAnalyticsRepo.getRevenueLast30Days.mockResolvedValue(new Decimal('500.00'))
})

// ---------------------------------------------------------------------------
// Test 1: getMyAnalytics returns object with all required keys
// ---------------------------------------------------------------------------
describe('getMyAnalytics', () => {
  it('returns an object with all required analytics keys', async () => {
    const result = await getMyAnalytics(mockUser)

    expect(result).toHaveProperty('totalRevenue')
    expect(result).toHaveProperty('totalOrders')
    expect(result).toHaveProperty('totalProductsSold')
    expect(result).toHaveProperty('topProducts')
    expect(result).toHaveProperty('revenueLast30Days')
  })

  it('totalRevenue is a string (Decimal serialized), not a number', async () => {
    const result = await getMyAnalytics(mockUser)

    expect(typeof result.totalRevenue).toBe('string')
    expect(result.totalRevenue).toBe('1500.00')

    expect(typeof result.revenueLast30Days).toBe('string')
    expect(result.revenueLast30Days).toBe('500.00')
  })
})
