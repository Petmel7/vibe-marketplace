import Decimal from 'decimal.js'
import { requireSeller } from '@/lib/auth/guards'
import { listStoresByOwnerId } from '@/features/store/store.repository'
import { assertStoreOwnership } from '@/features/store/store.service'
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
import { measureServerOperation } from '@/lib/observability/server-timing'
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

function buildEmptySellerAnalytics(
  resolvedRange: ReturnType<typeof resolveAnalyticsDateRange>,
): SellerAnalyticsDto {
  const buckets = buildDateBuckets(
    resolvedRange.current.from,
    resolvedRange.current.to,
    resolvedRange.interval,
  )
  const zeroMap = new Map<string, { value: Decimal; secondaryValue?: Decimal }>()

  return {
    totalRevenue: '0.00',
    totalOrders: 0,
    totalProductsSold: 0,
    topProducts: [],
    revenueLast30Days: '0.00',
    revenueTotal: '0.00',
    revenuePreviousPeriod: '0.00',
    revenueGrowthPercent: 0,
    ordersTotal: 0,
    ordersPreviousPeriod: 0,
    ordersGrowthPercent: 0,
    unitsSold: 0,
    averageOrderValue: '0.00',
    pendingFulfillmentCount: 0,
    shippedFulfillmentCount: 0,
    deliveredFulfillmentCount: 0,
    refundCount: 0,
    refundAmount: '0.00',
    disputeCount: 0,
    availableBalance: '0.00',
    pendingBalance: '0.00',
    paidOutAmount: '0.00',
    revenueSeries: fillMissingBucketsWithZero(buckets, zeroMap, (value) => value.toFixed(2)),
    orderSeries: fillMissingBucketsWithZero(buckets, zeroMap, (value) => value.toNumber()),
    fulfillmentSeries: fillMissingBucketsWithZero(buckets, zeroMap, (value) => value.toNumber()),
  }
}

export async function getMyAnalytics(
  user: SessionUser,
  query: SellerAnalyticsQuery = { range: '30d' },
): Promise<SellerAnalyticsDto> {
  requireSeller(user)

  const resolvedRange = resolveAnalyticsDateRange(query)
  const storeIds = query.storeId
    ? [(await assertStoreOwnership(user.id, query.storeId)).id]
    : (await listStoresByOwnerId(user.id)).map((store) => store.id)

  if (storeIds.length === 0) {
    return buildEmptySellerAnalytics(resolvedRange)
  }

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
    ] = await measureServerOperation(
      'getMyAnalytics',
      {
        service: 'features/seller/analytics/seller-analytics.service',
        route: '/seller/analytics',
        analytics: 'seller-full',
        sellerId: user.id,
        storeScope: query.storeId ?? 'all-owned-stores',
        interval: resolvedRange.interval,
      },
      () =>
        Promise.all([
          getTotalRevenue(storeIds),
          getOrderCount(storeIds),
          getTotalProductsSold(storeIds),
          getRevenueLast30Days(storeIds),
          getSellerRangeMetrics(storeIds, resolvedRange.current.from, resolvedRange.current.to),
          getSellerRangeMetrics(storeIds, resolvedRange.previous.from, resolvedRange.previous.to),
          getSellerRefundMetricsForRange(storeIds, resolvedRange.current.from, resolvedRange.current.to),
          getSellerDisputeCountForRange(storeIds, resolvedRange.current.from, resolvedRange.current.to),
          getSellerBalanceSnapshot(storeIds),
          getSellerRevenueSeriesForRange(
            storeIds,
            resolvedRange.current.from,
            resolvedRange.current.to,
            resolvedRange.interval,
          ),
          getSellerOrderSeriesForRange(
            storeIds,
            resolvedRange.current.from,
            resolvedRange.current.to,
            resolvedRange.interval,
          ),
          getSellerFulfillmentSeriesForRange(
            storeIds,
            resolvedRange.current.from,
            resolvedRange.current.to,
            resolvedRange.interval,
          ),
          getSellerTopProductsForRange(
            storeIds,
            resolvedRange.current.from,
            resolvedRange.current.to,
            TOP_PRODUCTS_LIMIT,
          ),
        ]),
    )

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

export async function getMyOverviewAnalytics(
  user: SessionUser,
): Promise<
  Pick<
    SellerAnalyticsDto,
    'totalRevenue' | 'totalOrders' | 'totalProductsSold' | 'revenueLast30Days' | 'topProducts'
  >
> {
  requireSeller(user)

  const storeIds = (await listStoresByOwnerId(user.id)).map((store) => store.id)

  if (storeIds.length === 0) {
    return {
      totalRevenue: '0.00',
      totalOrders: 0,
      totalProductsSold: 0,
      revenueLast30Days: '0.00',
      topProducts: [],
    }
  }

  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const to = new Date()

  try {
    const [totalRevenue, totalOrders, totalProductsSold, revenueLast30Days, topProducts] =
      await measureServerOperation(
        'getMyOverviewAnalytics',
        {
          service: 'features/seller/analytics/seller-analytics.service',
          route: '/seller',
          analytics: 'seller-overview',
          sellerId: user.id,
        },
        () =>
          Promise.all([
            getTotalRevenue(storeIds),
            getOrderCount(storeIds),
            getTotalProductsSold(storeIds),
            getRevenueLast30Days(storeIds),
            getSellerTopProductsForRange(storeIds, from, to, TOP_PRODUCTS_LIMIT),
          ]),
      )

    return {
      totalRevenue: totalRevenue.toFixed(2),
      totalOrders,
      totalProductsSold,
      revenueLast30Days: revenueLast30Days.toFixed(2),
      topProducts,
    }
  } catch (error) {
    throw new AnalyticsAggregationError(error instanceof Error ? error.message : undefined)
  }
}
