import { assertAdminAccess } from '@/lib/auth/adminGuards'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { AdminAnalyticsDto } from './admin-analytics.dto'
import type { AnalyticsQuery } from '@/features/analytics/analytics.schema'
import {
  buildDateBuckets,
  calculateGrowthPercent,
  fillMissingBucketsWithZero,
  formatBucketDate,
  getBucketStart,
  resolveAnalyticsDateRange,
} from '@/features/analytics/analytics.helpers'
import { AnalyticsAggregationError } from '@/lib/errors/analytics'
import {
  getActiveSellerCount,
  getAdminCommissionMetricsForRange,
  getAdminCommissionSeriesForRange,
  getAdminDisputeCountForRange,
  getAdminDisputeSeriesForRange,
  getAdminOrderMetricsForRange,
  getAdminOrderSeriesForRange,
  getAdminRefundMetricsForRange,
  getAdminRefundSeriesForRange,
  getAdminRevenueSeriesForRange,
  getAdminSellerGrowthSeriesForRange,
  getAdminTopCategoriesForRange,
  getAdminTopProductsForRange,
  getAdminTopSellersForRange,
  getGMV,
  getModerationStats,
  getOrderGrowthLast30Days,
  getPublishedProductCount,
  getRiskSummary,
  getSellerGrowthCountForRange,
  getSellerGrowthLast30Days,
  getTotalBuyerCount,
  getTotalOrderCount,
  getTotalProductCount,
  getTotalSellerCount,
  type AnalyticsBucketValueRow,
} from './admin-analytics.repository'

const TOP_LIMIT = 10

function toGroupedMap(
  rows: AnalyticsBucketValueRow[],
  interval: AnalyticsQuery['interval'],
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

export async function getMarketplaceAnalytics(
  admin: SessionUser,
  query: AnalyticsQuery = { range: '30d' },
): Promise<AdminAnalyticsDto> {
  assertAdminAccess(admin)

  const resolvedRange = resolveAnalyticsDateRange(query)

  try {
    const [
      gmv,
      totalOrders,
      totalSellers,
      totalBuyers,
      totalProducts,
      sellerGrowthLast30Days,
      orderGrowthLast30Days,
      moderationStats,
      currentOrderMetrics,
      previousOrderMetrics,
      currentCommissionMetrics,
      currentRefundMetrics,
      disputeCount,
      currentSellerGrowthCount,
      previousSellerGrowthCount,
      activeSellerCount,
      publishedProductCount,
      riskSummary,
      topSellers,
      topProducts,
      topCategories,
      revenueSeriesRows,
      orderSeriesRows,
      sellerGrowthSeriesRows,
      refundSeriesRows,
      disputeSeriesRows,
      commissionSeriesRows,
    ] = await Promise.all([
      getGMV(),
      getTotalOrderCount(),
      getTotalSellerCount(),
      getTotalBuyerCount(),
      getTotalProductCount(),
      getSellerGrowthLast30Days(),
      getOrderGrowthLast30Days(),
      getModerationStats(),
      getAdminOrderMetricsForRange(resolvedRange.current.from, resolvedRange.current.to),
      getAdminOrderMetricsForRange(resolvedRange.previous.from, resolvedRange.previous.to),
      getAdminCommissionMetricsForRange(resolvedRange.current.from, resolvedRange.current.to),
      getAdminRefundMetricsForRange(resolvedRange.current.from, resolvedRange.current.to),
      getAdminDisputeCountForRange(resolvedRange.current.from, resolvedRange.current.to),
      getSellerGrowthCountForRange(resolvedRange.current.from, resolvedRange.current.to),
      getSellerGrowthCountForRange(resolvedRange.previous.from, resolvedRange.previous.to),
      getActiveSellerCount(),
      getPublishedProductCount(),
      getRiskSummary(),
      getAdminTopSellersForRange(
        resolvedRange.current.from,
        resolvedRange.current.to,
        TOP_LIMIT,
      ),
      getAdminTopProductsForRange(
        resolvedRange.current.from,
        resolvedRange.current.to,
        TOP_LIMIT,
      ),
      getAdminTopCategoriesForRange(
        resolvedRange.current.from,
        resolvedRange.current.to,
        TOP_LIMIT,
      ),
      getAdminRevenueSeriesForRange(
        resolvedRange.current.from,
        resolvedRange.current.to,
        resolvedRange.interval,
      ),
      getAdminOrderSeriesForRange(
        resolvedRange.current.from,
        resolvedRange.current.to,
        resolvedRange.interval,
      ),
      getAdminSellerGrowthSeriesForRange(
        resolvedRange.current.from,
        resolvedRange.current.to,
        resolvedRange.interval,
      ),
      getAdminRefundSeriesForRange(
        resolvedRange.current.from,
        resolvedRange.current.to,
        resolvedRange.interval,
      ),
      getAdminDisputeSeriesForRange(
        resolvedRange.current.from,
        resolvedRange.current.to,
        resolvedRange.interval,
      ),
      getAdminCommissionSeriesForRange(
        resolvedRange.current.from,
        resolvedRange.current.to,
        resolvedRange.interval,
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

    const sellerGrowthSeries = fillMissingBucketsWithZero(
      buckets,
      toGroupedMap(sellerGrowthSeriesRows, resolvedRange.interval),
      (value) => value.toNumber(),
    )

    const refundSeries = fillMissingBucketsWithZero(
      buckets,
      toGroupedMap(refundSeriesRows, resolvedRange.interval),
      (value) => value.toNumber(),
    )

    const disputeSeries = fillMissingBucketsWithZero(
      buckets,
      toGroupedMap(disputeSeriesRows, resolvedRange.interval),
      (value) => value.toNumber(),
    )

    const commissionSeries = fillMissingBucketsWithZero(
      buckets,
      toGroupedMap(commissionSeriesRows, resolvedRange.interval),
      (value) => value.toFixed(2),
    )

    return {
      gmv: gmv.toString(),
      totalOrders,
      totalSellers,
      totalBuyers,
      totalProducts,
      topSellers,
      topProducts,
      sellerGrowthLast30Days,
      orderGrowthLast30Days,
      moderationStats,
      gmvPreviousPeriod: previousOrderMetrics.gmv.toFixed(2),
      gmvGrowthPercent: calculateGrowthPercent(currentOrderMetrics.gmv, previousOrderMetrics.gmv),
      commissionRevenue: currentCommissionMetrics.commissionRevenue.toFixed(2),
      netSellerRevenue: currentCommissionMetrics.netSellerRevenue.toFixed(2),
      ordersTotal: currentOrderMetrics.ordersTotal,
      paidOrders: currentOrderMetrics.paidOrders,
      codOrders: currentOrderMetrics.codOrders,
      failedPayments: currentOrderMetrics.failedPayments,
      refundCount: currentRefundMetrics.refundCount,
      refundAmount: currentRefundMetrics.refundAmount.toFixed(2),
      disputeCount,
      disputeRate:
        currentOrderMetrics.ordersTotal > 0
          ? Number(((disputeCount / currentOrderMetrics.ordersTotal) * 100).toFixed(2))
          : 0,
      sellerGrowth: calculateGrowthPercent(currentSellerGrowthCount, previousSellerGrowthCount),
      activeSellerCount,
      newSellerCount: currentSellerGrowthCount,
      productCount: totalProducts,
      publishedProductCount,
      moderationQueueCount:
        moderationStats.pendingProductApprovals + moderationStats.pendingSellerApprovals,
      riskSummary,
      topCategories,
      revenueSeries,
      orderSeries,
      sellerGrowthSeries,
      refundSeries,
      disputeSeries,
      commissionSeries,
    }
  } catch (error) {
    throw new AnalyticsAggregationError(error instanceof Error ? error.message : undefined)
  }
}
