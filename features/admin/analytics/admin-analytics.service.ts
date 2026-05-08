import { assertAdminAccess } from '@/lib/auth/adminGuards'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { AdminAnalyticsDto } from './admin-analytics.dto'
import {
  getGMV,
  getTotalOrderCount,
  getTotalSellerCount,
  getTotalBuyerCount,
  getTotalProductCount,
  getTopSellers,
  getTopProducts,
  getSellerGrowthLast30Days,
  getOrderGrowthLast30Days,
  getModerationStats,
} from './admin-analytics.repository'

const TOP_LIMIT = 10

export async function getMarketplaceAnalytics(admin: SessionUser): Promise<AdminAnalyticsDto> {
  assertAdminAccess(admin)

  const [
    gmv,
    totalOrders,
    totalSellers,
    totalBuyers,
    totalProducts,
    topSellers,
    topProducts,
    sellerGrowthLast30Days,
    orderGrowthLast30Days,
    moderationStats,
  ] = await Promise.all([
    getGMV(),
    getTotalOrderCount(),
    getTotalSellerCount(),
    getTotalBuyerCount(),
    getTotalProductCount(),
    getTopSellers(TOP_LIMIT),
    getTopProducts(TOP_LIMIT),
    getSellerGrowthLast30Days(),
    getOrderGrowthLast30Days(),
    getModerationStats(),
  ])

  return {
    gmv: gmv.toString(),
    totalOrders,
    totalSellers,
    totalBuyers,
    totalProducts,
    topSellers: topSellers.map((s) => ({
      sellerId: s.sellerId,
      storeName: s.storeName,
      revenue: s.revenue.toString(),
      orderCount: s.orderCount,
    })),
    topProducts: topProducts.map((p) => ({
      productId: p.productId,
      name: p.name,
      totalSold: p.totalSold,
      revenue: p.revenue.toString(),
    })),
    sellerGrowthLast30Days,
    orderGrowthLast30Days,
    moderationStats,
  }
}
