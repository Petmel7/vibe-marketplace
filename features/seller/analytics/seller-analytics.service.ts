import { requireSeller } from '@/lib/auth/guards'
import { StoreNotFoundError } from '@/lib/errors/seller'
import { findStoreByUserId } from '@/features/store/store.repository'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { SellerAnalyticsDto } from './seller-analytics.dto'
import {
  getTotalRevenue,
  getOrderCount,
  getTotalProductsSold,
  getTopProducts,
  getRevenueLast30Days,
} from './seller-analytics.repository'

const TOP_PRODUCTS_LIMIT = 10

export async function getMyAnalytics(user: SessionUser): Promise<SellerAnalyticsDto> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()

  const totalRevenue = await getTotalRevenue(store.id)
  const totalOrders = await getOrderCount(store.id)
  const totalProductsSold = await getTotalProductsSold(store.id)
  const topProducts = await getTopProducts(store.id, TOP_PRODUCTS_LIMIT)
  const revenueLast30Days = await getRevenueLast30Days(store.id)

  return {
    totalRevenue: totalRevenue.toFixed(2),
    totalOrders,
    totalProductsSold,
    topProducts,
    revenueLast30Days: revenueLast30Days.toFixed(2),
  }
}
