import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/admin/analytics/admin-analytics.repository')
vi.mock('@/lib/auth/adminGuards')

import * as repo from '@/features/admin/analytics/admin-analytics.repository'
import * as adminGuards from '@/lib/auth/adminGuards'
import { getMarketplaceAnalytics } from '@/features/admin/analytics/admin-analytics.service'
import { AdminAccessError } from '@/lib/errors/admin'
import type { SessionUser } from '@/features/auth/auth.dto'
import Decimal from 'decimal.js'

const mockRepo = vi.mocked(repo)
const mockGuards = vi.mocked(adminGuards)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ADMIN_ID = 'admin-uuid-0001'
const mockAdmin: SessionUser = { id: ADMIN_ID, email: 'admin@test.com', roles: [] }
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
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks()
  mockGuards.assertAdminAccess.mockReturnValue(undefined)
  mockGuards.assertNotSelfModeration.mockReturnValue(undefined)
})

// ---------------------------------------------------------------------------
// getMarketplaceAnalytics
// ---------------------------------------------------------------------------

describe('getMarketplaceAnalytics', () => {
  it('returns correct DTO structure with all fields', async () => {
    setupRepoMocks()

    const result = await getMarketplaceAnalytics(mockAdmin)

    expect(mockGuards.assertAdminAccess).toHaveBeenCalledWith(mockAdmin)

    expect(result).toMatchObject({
      gmv: expect.any(String),
      totalOrders: 450,
      totalSellers: 80,
      totalBuyers: 1200,
      totalProducts: 3400,
      sellerGrowthLast30Days: 12,
      orderGrowthLast30Days: 75,
      moderationStats: {
        pendingSellerApprovals: 5,
        pendingProductApprovals: 20,
        suspendedSellers: 2,
        rejectedProducts: 8,
      },
    })

    expect(result.topSellers).toHaveLength(1)
    expect(result.topSellers[0].sellerId).toBe('seller-001')
    expect(result.topSellers[0].storeName).toBe('Fashion Store')
    expect(result.topSellers[0].orderCount).toBe(100)

    expect(result.topProducts).toHaveLength(1)
    expect(result.topProducts[0].productId).toBe('variant-001')
    expect(result.topProducts[0].name).toBe('Blue Jeans')
    expect(result.topProducts[0].totalSold).toBe(50)
  })

  it('serializes all Decimal values as strings', async () => {
    setupRepoMocks()

    const result = await getMarketplaceAnalytics(mockAdmin)

    expect(typeof result.gmv).toBe('string')
    expect(result.gmv).toBe('125000')

    expect(typeof result.topSellers[0].revenue).toBe('string')
    expect(result.topSellers[0].revenue).toBe('25000')

    expect(typeof result.topProducts[0].revenue).toBe('string')
    expect(result.topProducts[0].revenue).toBe('2500')
  })

  it('throws AdminAccessError on non-admin user', async () => {
    mockGuards.assertAdminAccess.mockImplementation((user) => {
      if (!user.roles.includes('ADMIN' as import('@/app/generated/prisma/client').UserRole)) {
        throw new AdminAccessError()
      }
    })

    await expect(getMarketplaceAnalytics(mockNonAdmin)).rejects.toThrow(AdminAccessError)

    expect(mockRepo.getGMV).not.toHaveBeenCalled()
    expect(mockRepo.getTotalOrderCount).not.toHaveBeenCalled()
  })
})
