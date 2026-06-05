import Decimal from 'decimal.js'
import { requireSeller } from '@/lib/auth/guards'
import { findStoreById, findStoreByUserId } from '@/features/store/store.repository'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { SellerAnalyticsDto } from './seller-analytics.dto'
import {
  buildDateBuckets,
  calculateGrowthPercent,
  fillMissingBucketsWithZero,
  groupByInterval,
  resolveAnalyticsDateRange,
} from '@/features/analytics/analytics.helpers'
import type { SellerAnalyticsQuery } from '@/features/analytics/analytics.schema'
import { AnalyticsAccessDeniedError, AnalyticsAggregationError } from '@/lib/errors/analytics'
import {
  getOrderCount,
  getRevenueLast30Days,
  getSellerBalanceSnapshot,
  getSellerDisputeCountForRange,
  getSellerOrderItemsForRange,
  getSellerRefundMetricsForRange,
  getTotalProductsSold,
  getTotalRevenue,
} from './seller-analytics.repository'
import { ItemFulfillmentStatus } from '@/app/generated/prisma/client'

const TOP_PRODUCTS_LIMIT = 10

function sumItemRevenue(items: { unitPriceSnapshot: Decimal; quantity: number }[]): Decimal {
  return items.reduce(
    (sum, item) => sum.plus(new Decimal(item.unitPriceSnapshot.toString()).mul(item.quantity)),
    new Decimal(0),
  )
}

function buildTopProductsFromItems(
  items: Awaited<ReturnType<typeof getSellerOrderItemsForRange>>,
): SellerAnalyticsDto['topProducts'] {
  const grouped = new Map<
    string,
    { productId: string; name: string; totalSold: number; revenue: Decimal }
  >()

  for (const item of items) {
    const existing = grouped.get(item.productNameSnapshot)
    const revenue = new Decimal(item.unitPriceSnapshot.toString()).mul(item.quantity)

    if (existing) {
      existing.totalSold += item.quantity
      existing.revenue = existing.revenue.plus(revenue)
      continue
    }

    grouped.set(item.productNameSnapshot, {
      productId: item.variantId,
      name: item.productNameSnapshot,
      totalSold: item.quantity,
      revenue,
    })
  }

  return Array.from(grouped.values())
    .sort((left, right) => right.totalSold - left.totalSold)
    .slice(0, TOP_PRODUCTS_LIMIT)
    .map((item) => ({
      productId: item.productId,
      name: item.name,
      totalSold: item.totalSold,
      revenue: item.revenue.toFixed(2),
    }))
}

export async function getMyAnalytics(
  user: SessionUser,
  query: SellerAnalyticsQuery = { range: '30d' },
): Promise<SellerAnalyticsDto> {
  requireSeller(user)

  const store = query.storeId
    ? await findStoreById(query.storeId)
    : await findStoreByUserId(user.id)

  if (!store || store.ownerId !== user.id) {
    throw new AnalyticsAccessDeniedError('You do not have access to this store analytics')
  }

  const resolvedRange = resolveAnalyticsDateRange(query)

  try {
    const [
      totalRevenue,
      totalOrders,
      totalProductsSold,
      revenueLast30Days,
      currentItems,
      previousItems,
      refundMetrics,
      disputeCount,
      balance,
    ] = await Promise.all([
      getTotalRevenue(store.id),
      getOrderCount(store.id),
      getTotalProductsSold(store.id),
      getRevenueLast30Days(store.id),
      getSellerOrderItemsForRange(store.id, resolvedRange.current.from, resolvedRange.current.to),
      getSellerOrderItemsForRange(store.id, resolvedRange.previous.from, resolvedRange.previous.to),
      getSellerRefundMetricsForRange(store.id, resolvedRange.current.from, resolvedRange.current.to),
      getSellerDisputeCountForRange(store.id, resolvedRange.current.from, resolvedRange.current.to),
      getSellerBalanceSnapshot(store.id),
    ])

    const revenueTotal = sumItemRevenue(currentItems)
    const revenuePreviousPeriod = sumItemRevenue(previousItems)
    const currentOrderIds = new Set(currentItems.map((item) => item.orderId))
    const previousOrderIds = new Set(previousItems.map((item) => item.orderId))
    const unitsSold = currentItems.reduce((sum, item) => sum + item.quantity, 0)
    const pendingFulfillmentCount = currentItems.filter(
      (item) => item.fulfillmentStatus === ItemFulfillmentStatus.PENDING,
    ).length
    const shippedFulfillmentCount = currentItems.filter(
      (item) => item.fulfillmentStatus === ItemFulfillmentStatus.SHIPPED,
    ).length
    const deliveredFulfillmentCount = currentItems.filter(
      (item) => item.fulfillmentStatus === ItemFulfillmentStatus.DELIVERED,
    ).length

    const buckets = buildDateBuckets(
      resolvedRange.current.from,
      resolvedRange.current.to,
      resolvedRange.interval,
    )
    const revenueSeries = fillMissingBucketsWithZero(
      buckets,
      groupByInterval(currentItems, {
        interval: resolvedRange.interval,
        getDate: (item) => item.createdAt,
        getValue: (item) => new Decimal(item.unitPriceSnapshot.toString()).mul(item.quantity),
      }),
      (value) => value.toFixed(2),
    )

    const uniqueOrders = Array.from(
      currentItems.reduce((map, item) => {
        if (!map.has(item.orderId)) {
          map.set(item.orderId, { orderId: item.orderId, createdAt: item.createdAt })
        }

        return map
      }, new Map<string, { orderId: string; createdAt: Date }>()),
    ).map(([, value]) => value)

    const orderSeries = fillMissingBucketsWithZero(
      buckets,
      groupByInterval(uniqueOrders, {
        interval: resolvedRange.interval,
        getDate: (item) => item.createdAt,
        getValue: () => 1,
      }),
      (value) => value.toNumber(),
    )

    const fulfillmentSeries = fillMissingBucketsWithZero(
      buckets,
      groupByInterval(currentItems, {
        interval: resolvedRange.interval,
        getDate: (item) => item.createdAt,
        getValue: () => 1,
        getSecondaryValue: (item) =>
          item.fulfillmentStatus === ItemFulfillmentStatus.DELIVERED ? 1 : undefined,
      }),
      (value) => value.toNumber(),
    )

    return {
      totalRevenue: totalRevenue.toFixed(2),
      totalOrders,
      totalProductsSold,
      topProducts: buildTopProductsFromItems(currentItems),
      revenueLast30Days: revenueLast30Days.toFixed(2),
      revenueTotal: revenueTotal.toFixed(2),
      revenuePreviousPeriod: revenuePreviousPeriod.toFixed(2),
      revenueGrowthPercent: calculateGrowthPercent(revenueTotal, revenuePreviousPeriod),
      ordersTotal: currentOrderIds.size,
      ordersPreviousPeriod: previousOrderIds.size,
      ordersGrowthPercent: calculateGrowthPercent(currentOrderIds.size, previousOrderIds.size),
      unitsSold,
      averageOrderValue:
        currentOrderIds.size > 0 ? revenueTotal.div(currentOrderIds.size).toFixed(2) : '0.00',
      pendingFulfillmentCount,
      shippedFulfillmentCount,
      deliveredFulfillmentCount,
      refundCount: refundMetrics.refundCount,
      refundAmount: refundMetrics.refundAmount.toFixed(2),
      disputeCount,
      availableBalance: balance?.availableAmount.toFixed(2) ?? '0.00',
      pendingBalance: balance?.pendingAmount.toFixed(2) ?? '0.00',
      paidOutAmount: balance?.paidOutAmount.toFixed(2) ?? '0.00',
      revenueSeries,
      orderSeries,
      fulfillmentSeries,
    }
  } catch (error) {
    if (error instanceof AnalyticsAccessDeniedError) {
      throw error
    }

    throw new AnalyticsAggregationError(error instanceof Error ? error.message : undefined)
  }
}
