import Decimal from 'decimal.js'
import { requireSeller } from '@/lib/auth/guards'
import { findStoreById, findStoreByUserId } from '@/features/store/store.repository'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { SellerAnalyticsDto } from './seller-analytics.dto'
import {
  buildDateBuckets,
  calculateGrowthPercent,
  fillMissingBucketsWithZero,
  formatBucketDate,
  getBucketStart,
  resolveAnalyticsDateRange,
} from '@/features/analytics/analytics.helpers'
import type { SellerAnalyticsQuery } from '@/features/analytics/analytics.schema'
import { AnalyticsAccessDeniedError, AnalyticsAggregationError } from '@/lib/errors/analytics'
import {
  getOrderCount,
  getRevenueLast30Days,
  getSellerBalanceSnapshot,
  getSellerDisputeCountForRange,
  getSellerFulfillmentSeriesForRange,
  getSellerOrderSeriesForRange,
  getSellerRangeMetrics,
  getSellerRefundMetricsForRange,
  getSellerRevenueSeriesForRange,
  getSellerTopProductsForRange,
  getTotalProductsSold,
  getTotalRevenue,
  type AnalyticsBucketValueRow,
} from './seller-analytics.repository'

const TOP_PRODUCTS_LIMIT = 10

function toGroupedMap(
  rows: AnalyticsBucketValueRow[],
  interval: SellerAnalyticsQuery['interval'],
) {
  return new Map(
    rows.map((row) => [
      formatBucketDate(getBucketStart(row.bucket, interval ?? 'day'), interval ?? 'day'),
      {
        value: row.value,
        secondaryValue: row.secondaryValue,
      },
    ]),
  )
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
      currentMetrics,
      previousMetrics,
      refundMetrics,
      disputeCount,
      balance,
      revenueSeriesRows,
      orderSeriesRows,
      fulfillmentSeriesRows,
      topProducts,
    ] = await Promise.all([
      getTotalRevenue(store.id),
      getOrderCount(store.id),
      getTotalProductsSold(store.id),
      getRevenueLast30Days(store.id),
      getSellerRangeMetrics(store.id, resolvedRange.current.from, resolvedRange.current.to),
      getSellerRangeMetrics(store.id, resolvedRange.previous.from, resolvedRange.previous.to),
      getSellerRefundMetricsForRange(store.id, resolvedRange.current.from, resolvedRange.current.to),
      getSellerDisputeCountForRange(store.id, resolvedRange.current.from, resolvedRange.current.to),
      getSellerBalanceSnapshot(store.id),
      getSellerRevenueSeriesForRange(
        store.id,
        resolvedRange.current.from,
        resolvedRange.current.to,
        resolvedRange.interval,
      ),
      getSellerOrderSeriesForRange(
        store.id,
        resolvedRange.current.from,
        resolvedRange.current.to,
        resolvedRange.interval,
      ),
      getSellerFulfillmentSeriesForRange(
        store.id,
        resolvedRange.current.from,
        resolvedRange.current.to,
        resolvedRange.interval,
      ),
      getSellerTopProductsForRange(
        store.id,
        resolvedRange.current.from,
        resolvedRange.current.to,
        TOP_PRODUCTS_LIMIT,
      ),
    ])

    const buckets = buildDateBuckets(
      resolvedRange.current.from,
      resolvedRange.current.to,
      resolvedRange.interval,
    )

    const revenueSeries = fillMissingBucketsWithZero(
      buckets,
      toGroupedMap(revenueSeriesRows, resolvedRange.interval),
      (value) => value.toFixed(2),
    )

    const orderSeries = fillMissingBucketsWithZero(
      buckets,
      toGroupedMap(orderSeriesRows, resolvedRange.interval),
      (value) => value.toNumber(),
    )

    const fulfillmentSeries = fillMissingBucketsWithZero(
      buckets,
      toGroupedMap(fulfillmentSeriesRows, resolvedRange.interval),
      (value) => value.toNumber(),
    )

    return {
      totalRevenue: totalRevenue.toFixed(2),
      totalOrders,
      totalProductsSold,
      topProducts,
      revenueLast30Days: revenueLast30Days.toFixed(2),
      revenueTotal: currentMetrics.revenueTotal.toFixed(2),
      revenuePreviousPeriod: previousMetrics.revenueTotal.toFixed(2),
      revenueGrowthPercent: calculateGrowthPercent(
        currentMetrics.revenueTotal,
        previousMetrics.revenueTotal,
      ),
      ordersTotal: currentMetrics.ordersTotal,
      ordersPreviousPeriod: previousMetrics.ordersTotal,
      ordersGrowthPercent: calculateGrowthPercent(
        currentMetrics.ordersTotal,
        previousMetrics.ordersTotal,
      ),
      unitsSold: currentMetrics.unitsSold,
      averageOrderValue:
        currentMetrics.ordersTotal > 0
          ? currentMetrics.revenueTotal.div(currentMetrics.ordersTotal).toFixed(2)
          : new Decimal(0).toFixed(2),
      pendingFulfillmentCount: currentMetrics.pendingFulfillmentCount,
      shippedFulfillmentCount: currentMetrics.shippedFulfillmentCount,
      deliveredFulfillmentCount: currentMetrics.deliveredFulfillmentCount,
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
