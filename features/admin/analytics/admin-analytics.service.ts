import Decimal from 'decimal.js'
import { PaymentMethod, PaymentStatus, RefundRequestStatus } from '@/app/generated/prisma/client'
import { assertAdminAccess } from '@/lib/auth/adminGuards'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { AdminAnalyticsDto } from './admin-analytics.dto'
import type { AnalyticsQuery } from '@/features/analytics/analytics.schema'
import {
  buildDateBuckets,
  calculateGrowthPercent,
  fillMissingBucketsWithZero,
  groupByInterval,
  resolveAnalyticsDateRange,
} from '@/features/analytics/analytics.helpers'
import { AnalyticsAggregationError } from '@/lib/errors/analytics'
import {
  getActiveSellerCount,
  getCommissionRowsForRange,
  getDisputeRowsForRange,
  getGMV,
  getModerationStats,
  getOrderGrowthLast30Days,
  getOrderItemsForRange,
  getOrdersForRange,
  getPublishedProductCount,
  getRefundRowsForRange,
  getRiskSummary,
  getSellerGrowthLast30Days,
  getSellerGrowthRowsForRange,
  getTotalBuyerCount,
  getTotalOrderCount,
  getTotalProductCount,
  getTotalSellerCount,
} from './admin-analytics.repository'

const TOP_LIMIT = 10
const GMV_ORDER_STATUSES = new Set(['paid', 'confirmed', 'processing', 'shipped', 'delivered'])

function buildTopCategoriesFromItems(
  items: Awaited<ReturnType<typeof getOrderItemsForRange>>,
): AdminAnalyticsDto['topCategories'] {
  const grouped = new Map<
    string,
    { categoryId: string | null; name: string; totalSold: number; revenue: Decimal }
  >()

  for (const item of items) {
    const category = item.variant.product.category
    const key = category?.id ?? 'uncategorized'
    const revenue = new Decimal(item.unitPriceSnapshot.toString()).mul(item.quantity)
    const existing = grouped.get(key)

    if (existing) {
      existing.totalSold += item.quantity
      existing.revenue = existing.revenue.plus(revenue)
      continue
    }

    grouped.set(key, {
      categoryId: category?.id ?? null,
      name: category?.name ?? 'Uncategorized',
      totalSold: item.quantity,
      revenue,
    })
  }

  return Array.from(grouped.values())
    .sort((left, right) => right.revenue.comparedTo(left.revenue))
    .slice(0, TOP_LIMIT)
    .map((item) => ({
      categoryId: item.categoryId,
      name: item.name,
      totalSold: item.totalSold,
      revenue: item.revenue.toFixed(2),
    }))
}

function buildTopSellersFromItems(
  items: Awaited<ReturnType<typeof getOrderItemsForRange>>,
): AdminAnalyticsDto['topSellers'] {
  const grouped = new Map<
    string,
    { sellerId: string; storeId: string; storeName: string; revenue: Decimal; orderIds: Set<string> }
  >()

  for (const item of items) {
    const revenue = new Decimal(item.unitPriceSnapshot.toString()).mul(item.quantity)
    const existing = grouped.get(item.storeId)

    if (existing) {
      existing.revenue = existing.revenue.plus(revenue)
      existing.orderIds.add(item.orderId)
      continue
    }

    grouped.set(item.storeId, {
      sellerId: item.store.ownerId,
      storeId: item.storeId,
      storeName: item.store.name,
      revenue,
      orderIds: new Set([item.orderId]),
    })
  }

  return Array.from(grouped.values())
    .sort((left, right) => right.revenue.comparedTo(left.revenue))
    .slice(0, TOP_LIMIT)
    .map((item) => ({
      sellerId: item.sellerId,
      storeId: item.storeId,
      storeName: item.storeName,
      revenue: item.revenue.toFixed(2),
      orderCount: item.orderIds.size,
    }))
}

function buildTopProductsFromItems(
  items: Awaited<ReturnType<typeof getOrderItemsForRange>>,
): AdminAnalyticsDto['topProducts'] {
  const grouped = new Map<
    string,
    { productId: string; name: string; totalSold: number; revenue: Decimal }
  >()

  for (const item of items) {
    const revenue = new Decimal(item.unitPriceSnapshot.toString()).mul(item.quantity)
    const existing = grouped.get(item.productNameSnapshot)

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
    .slice(0, TOP_LIMIT)
    .map((item) => ({
      productId: item.productId,
      name: item.name,
      totalSold: item.totalSold,
      revenue: item.revenue.toFixed(2),
    }))
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
      currentOrders,
      previousOrders,
      currentOrderItems,
      currentCommissions,
      currentRefunds,
      currentDisputes,
      currentSellerGrowth,
      previousSellerGrowth,
      activeSellerCount,
      publishedProductCount,
      riskSummary,
    ] = await Promise.all([
      getGMV(),
      getTotalOrderCount(),
      getTotalSellerCount(),
      getTotalBuyerCount(),
      getTotalProductCount(),
      getSellerGrowthLast30Days(),
      getOrderGrowthLast30Days(),
      getModerationStats(),
      getOrdersForRange(resolvedRange.current.from, resolvedRange.current.to),
      getOrdersForRange(resolvedRange.previous.from, resolvedRange.previous.to),
      getOrderItemsForRange(resolvedRange.current.from, resolvedRange.current.to),
      getCommissionRowsForRange(resolvedRange.current.from, resolvedRange.current.to),
      getRefundRowsForRange(resolvedRange.current.from, resolvedRange.current.to),
      getDisputeRowsForRange(resolvedRange.current.from, resolvedRange.current.to),
      getSellerGrowthRowsForRange(resolvedRange.current.from, resolvedRange.current.to),
      getSellerGrowthRowsForRange(resolvedRange.previous.from, resolvedRange.previous.to),
      getActiveSellerCount(),
      getPublishedProductCount(),
      getRiskSummary(),
    ])

    const gmvCurrent = currentOrders.reduce((sum, order) => {
      if (!GMV_ORDER_STATUSES.has(order.status)) {
        return sum
      }
      return sum.plus(order.totalAmount.toString())
    }, new Decimal(0))
    const gmvPrevious = previousOrders.reduce((sum, order) => {
      if (!GMV_ORDER_STATUSES.has(order.status)) {
        return sum
      }
      return sum.plus(order.totalAmount.toString())
    }, new Decimal(0))

    const commissionRevenue = currentCommissions.reduce(
      (sum, row) => sum.plus(row.commissionAmount.toString()),
      new Decimal(0),
    )
    const netSellerRevenue = currentCommissions.reduce(
      (sum, row) => sum.plus(row.sellerNetAmount.toString()),
      new Decimal(0),
    )
    const paidOrders = currentOrders.filter((order) => GMV_ORDER_STATUSES.has(order.status)).length
    const codOrders = currentOrders.filter((order) =>
      order.payments.some((payment) => payment.method === PaymentMethod.CASH_ON_DELIVERY),
    ).length
    const failedPayments = currentOrders.reduce((sum, order) => {
      return sum + order.payments.filter((payment) => payment.status === PaymentStatus.FAILED).length
    }, 0)
    const refundCount = currentRefunds.length
    const refundAmount = currentRefunds.reduce((sum, refund) => {
      if (refund.status !== RefundRequestStatus.SUCCEEDED) {
        return sum
      }
      return sum.plus(refund.amount.toString())
    }, new Decimal(0))
    const disputeCount = currentDisputes.length

    const buckets = buildDateBuckets(
      resolvedRange.current.from,
      resolvedRange.current.to,
      resolvedRange.interval,
    )

    const revenueSeries = fillMissingBucketsWithZero(
      buckets,
      groupByInterval(currentOrderItems, {
        interval: resolvedRange.interval,
        getDate: (item) => item.createdAt,
        getValue: (item) => new Decimal(item.unitPriceSnapshot.toString()).mul(item.quantity),
      }),
      (value) => value.toFixed(2),
    )

    const orderSeries = fillMissingBucketsWithZero(
      buckets,
      groupByInterval(currentOrders, {
        interval: resolvedRange.interval,
        getDate: (item) => item.createdAt,
        getValue: () => 1,
      }),
      (value) => value.toNumber(),
    )

    const sellerGrowthSeries = fillMissingBucketsWithZero(
      buckets,
      groupByInterval(currentSellerGrowth, {
        interval: resolvedRange.interval,
        getDate: (item) => item.createdAt,
        getValue: () => 1,
      }),
      (value) => value.toNumber(),
    )

    const refundSeries = fillMissingBucketsWithZero(
      buckets,
      groupByInterval(currentRefunds, {
        interval: resolvedRange.interval,
        getDate: (item) => item.createdAt,
        getValue: () => 1,
        getSecondaryValue: (item) =>
          item.status === RefundRequestStatus.SUCCEEDED ? item.amount : undefined,
      }),
      (value) => value.toNumber(),
    )

    const disputeSeries = fillMissingBucketsWithZero(
      buckets,
      groupByInterval(currentDisputes, {
        interval: resolvedRange.interval,
        getDate: (item) => item.createdAt,
        getValue: () => 1,
      }),
      (value) => value.toNumber(),
    )

    const commissionSeries = fillMissingBucketsWithZero(
      buckets,
      groupByInterval(currentCommissions, {
        interval: resolvedRange.interval,
        getDate: (item) => item.createdAt,
        getValue: (item) => item.commissionAmount,
      }),
      (value) => value.toFixed(2),
    )

    return {
      gmv: gmv.toString(),
      totalOrders,
      totalSellers,
      totalBuyers,
      totalProducts,
      topSellers: buildTopSellersFromItems(currentOrderItems),
      topProducts: buildTopProductsFromItems(currentOrderItems),
      sellerGrowthLast30Days,
      orderGrowthLast30Days,
      moderationStats,
      gmvPreviousPeriod: gmvPrevious.toFixed(2),
      gmvGrowthPercent: calculateGrowthPercent(gmvCurrent, gmvPrevious),
      commissionRevenue: commissionRevenue.toFixed(2),
      netSellerRevenue: netSellerRevenue.toFixed(2),
      ordersTotal: currentOrders.length,
      paidOrders,
      codOrders,
      failedPayments,
      refundCount,
      refundAmount: refundAmount.toFixed(2),
      disputeCount,
      disputeRate:
        currentOrders.length > 0
          ? Number(new Decimal(disputeCount).div(currentOrders.length).mul(100).toFixed(2))
          : 0,
      sellerGrowth: calculateGrowthPercent(currentSellerGrowth.length, previousSellerGrowth.length),
      activeSellerCount,
      newSellerCount: currentSellerGrowth.length,
      productCount: totalProducts,
      publishedProductCount,
      moderationQueueCount:
        moderationStats.pendingProductApprovals + moderationStats.pendingSellerApprovals,
      riskSummary,
      topCategories: buildTopCategoriesFromItems(currentOrderItems),
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
