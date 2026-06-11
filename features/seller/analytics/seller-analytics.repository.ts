import Decimal from 'decimal.js'
import {
  Prisma,
  OrderStatus,
  RefundRequestStatus,
} from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type { AnalyticsInterval } from '@/features/analytics/analytics.helpers'
import type { TopProductEntry } from './seller-analytics.dto'

export type AnalyticsBucketValueRow = {
  bucket: Date
  value: Decimal
  secondaryValue?: Decimal
}

export type SellerRangeMetrics = {
  revenueTotal: Decimal
  ordersTotal: number
  unitsSold: number
  pendingFulfillmentCount: number
  shippedFulfillmentCount: number
  deliveredFulfillmentCount: number
}

type DecimalLike = Prisma.Decimal | Decimal | string | number | bigint | null | undefined
type NumberLike = string | number | bigint | null | undefined

type SellerRangeMetricsRow = {
  revenueTotal: DecimalLike
  ordersTotal: NumberLike
  unitsSold: NumberLike
  pendingFulfillmentCount: NumberLike
  shippedFulfillmentCount: NumberLike
  deliveredFulfillmentCount: NumberLike
}

type SeriesRow = {
  bucket: Date
  value: DecimalLike
  secondaryValue?: DecimalLike
}

type TopProductRow = {
  productId: string
  name: string
  totalSold: NumberLike
  revenue: DecimalLike
}

const SELLER_REVENUE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.paid,
  OrderStatus.confirmed,
  OrderStatus.processing,
  OrderStatus.shipped,
  OrderStatus.delivered,
]

function toDecimal(value: DecimalLike): Decimal {
  if (value == null) {
    return new Decimal(0)
  }

  if (value instanceof Decimal) {
    return value
  }

  return new Decimal(value.toString())
}

function toInteger(value: NumberLike): number {
  if (value == null) {
    return 0
  }

  return Number(value)
}

function mapSeriesRows(rows: SeriesRow[]): AnalyticsBucketValueRow[] {
  return rows.map((row) => ({
    bucket: row.bucket,
    value: toDecimal(row.value),
    secondaryValue: row.secondaryValue != null ? toDecimal(row.secondaryValue) : undefined,
  }))
}

function getBucketExpression(interval: AnalyticsInterval, columnName: string) {
  const trunc =
    interval === 'day' ? 'day' : interval === 'week' ? 'week' : 'month'

  return Prisma.raw(`date_trunc('${trunc}', ${columnName} AT TIME ZONE 'UTC')`)
}

function revenueStatusFilterSql() {
  return Prisma.sql`IN (${Prisma.join(SELLER_REVENUE_ORDER_STATUSES)})`
}

function storeIdsFilterSql(storeIds: string[]) {
  return Prisma.sql`IN (${Prisma.join(storeIds.map((storeId) => Prisma.sql`${storeId}::uuid`))})`
}

export async function getTotalRevenue(storeIds: string[]): Promise<Decimal> {
  const [row] = await prisma.$queryRaw<Array<{ value: DecimalLike }>>(Prisma.sql`
    SELECT COALESCE(SUM(oi.unit_price_snapshot * oi.quantity), 0) AS value
    FROM order_items oi
    WHERE oi.store_id ${storeIdsFilterSql(storeIds)}
  `)

  return toDecimal(row?.value)
}

export async function getOrderCount(storeIds: string[]): Promise<number> {
  const [row] = await prisma.$queryRaw<Array<{ value: NumberLike }>>(Prisma.sql`
    SELECT COUNT(DISTINCT oi.order_id)::int AS value
    FROM order_items oi
    WHERE oi.store_id ${storeIdsFilterSql(storeIds)}
  `)

  return toInteger(row?.value)
}

export async function getTotalProductsSold(storeIds: string[]): Promise<number> {
  const result = await prisma.orderItem.aggregate({
    where: { storeId: { in: storeIds } },
    _sum: { quantity: true },
  })
  return result._sum.quantity ?? 0
}

export async function getRevenueLast30Days(storeIds: string[]): Promise<Decimal> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [row] = await prisma.$queryRaw<Array<{ value: DecimalLike }>>(Prisma.sql`
    SELECT COALESCE(SUM(oi.unit_price_snapshot * oi.quantity), 0) AS value
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.store_id ${storeIdsFilterSql(storeIds)}
      AND oi.created_at >= ${since}
      AND o.status ${revenueStatusFilterSql()}
  `)

  return toDecimal(row?.value)
}

export async function getSellerRangeMetrics(
  storeIds: string[],
  from: Date,
  to: Date,
): Promise<SellerRangeMetrics> {
  const [row] = await prisma.$queryRaw<SellerRangeMetricsRow[]>(Prisma.sql`
    SELECT
      COALESCE(SUM(oi.unit_price_snapshot * oi.quantity), 0) AS "revenueTotal",
      COUNT(DISTINCT oi.order_id)::int AS "ordersTotal",
      COALESCE(SUM(oi.quantity), 0)::int AS "unitsSold",
      COUNT(*) FILTER (WHERE oi.fulfillment_status = ${'PENDING'})::int AS "pendingFulfillmentCount",
      COUNT(*) FILTER (WHERE oi.fulfillment_status = ${'SHIPPED'})::int AS "shippedFulfillmentCount",
      COUNT(*) FILTER (WHERE oi.fulfillment_status = ${'DELIVERED'})::int AS "deliveredFulfillmentCount"
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.store_id ${storeIdsFilterSql(storeIds)}
      AND oi.created_at >= ${from}
      AND oi.created_at <= ${to}
      AND o.status ${revenueStatusFilterSql()}
  `)

  return {
    revenueTotal: toDecimal(row?.revenueTotal),
    ordersTotal: toInteger(row?.ordersTotal),
    unitsSold: toInteger(row?.unitsSold),
    pendingFulfillmentCount: toInteger(row?.pendingFulfillmentCount),
    shippedFulfillmentCount: toInteger(row?.shippedFulfillmentCount),
    deliveredFulfillmentCount: toInteger(row?.deliveredFulfillmentCount),
  }
}

export async function getSellerRevenueSeriesForRange(
  storeIds: string[],
  from: Date,
  to: Date,
  interval: AnalyticsInterval,
): Promise<AnalyticsBucketValueRow[]> {
  const bucket = getBucketExpression(interval, 'oi.created_at')
  const rows = await prisma.$queryRaw<SeriesRow[]>(Prisma.sql`
    SELECT
      ${bucket} AS bucket,
      COALESCE(SUM(oi.unit_price_snapshot * oi.quantity), 0) AS value
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.store_id ${storeIdsFilterSql(storeIds)}
      AND oi.created_at >= ${from}
      AND oi.created_at <= ${to}
      AND o.status ${revenueStatusFilterSql()}
    GROUP BY 1
    ORDER BY 1
  `)

  return mapSeriesRows(rows)
}

export async function getSellerOrderSeriesForRange(
  storeIds: string[],
  from: Date,
  to: Date,
  interval: AnalyticsInterval,
): Promise<AnalyticsBucketValueRow[]> {
  const bucket = getBucketExpression(interval, 'oi.created_at')
  const rows = await prisma.$queryRaw<SeriesRow[]>(Prisma.sql`
    SELECT
      ${bucket} AS bucket,
      COUNT(DISTINCT oi.order_id)::int AS value
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.store_id ${storeIdsFilterSql(storeIds)}
      AND oi.created_at >= ${from}
      AND oi.created_at <= ${to}
      AND o.status ${revenueStatusFilterSql()}
    GROUP BY 1
    ORDER BY 1
  `)

  return mapSeriesRows(rows)
}

export async function getSellerFulfillmentSeriesForRange(
  storeIds: string[],
  from: Date,
  to: Date,
  interval: AnalyticsInterval,
): Promise<AnalyticsBucketValueRow[]> {
  const bucket = getBucketExpression(interval, 'oi.created_at')
  const rows = await prisma.$queryRaw<SeriesRow[]>(Prisma.sql`
    SELECT
      ${bucket} AS bucket,
      COUNT(*)::int AS value,
      COUNT(*) FILTER (WHERE oi.fulfillment_status = ${'DELIVERED'})::int AS "secondaryValue"
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.store_id ${storeIdsFilterSql(storeIds)}
      AND oi.created_at >= ${from}
      AND oi.created_at <= ${to}
      AND o.status ${revenueStatusFilterSql()}
    GROUP BY 1
    ORDER BY 1
  `)

  return mapSeriesRows(rows)
}

export async function getSellerTopProductsForRange(
  storeIds: string[],
  from: Date,
  to: Date,
  limit: number,
): Promise<TopProductEntry[]> {
  const rows = await prisma.$queryRaw<TopProductRow[]>(Prisma.sql`
    SELECT
      MIN(oi.variant_id)::text AS "productId",
      oi.product_name_snapshot AS name,
      COALESCE(SUM(oi.quantity), 0)::int AS "totalSold",
      COALESCE(SUM(oi.unit_price_snapshot * oi.quantity), 0) AS revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.store_id ${storeIdsFilterSql(storeIds)}
      AND oi.created_at >= ${from}
      AND oi.created_at <= ${to}
      AND o.status ${revenueStatusFilterSql()}
    GROUP BY oi.product_name_snapshot
    ORDER BY "totalSold" DESC, revenue DESC, name ASC
    LIMIT ${limit}
  `)

  return rows.map((row) => ({
    productId: row.productId,
    name: row.name,
    totalSold: toInteger(row.totalSold),
    revenue: toDecimal(row.revenue).toFixed(2),
  }))
}

export async function getSellerRefundMetricsForRange(
  storeIds: string[],
  from: Date,
  to: Date,
): Promise<{ refundCount: number; refundAmount: Decimal }> {
  const [count, sum] = await Promise.all([
    prisma.refundRequest.count({
      where: {
        createdAt: { gte: from, lte: to },
        orderItem: { storeId: { in: storeIds } },
      },
    }),
    prisma.refundRequest.aggregate({
      where: {
        createdAt: { gte: from, lte: to },
        status: RefundRequestStatus.SUCCEEDED,
        orderItem: { storeId: { in: storeIds } },
      },
      _sum: {
        amount: true,
      },
    }),
  ])

  return {
    refundCount: count,
    refundAmount: toDecimal(sum._sum.amount),
  }
}

export async function getSellerDisputeCountForRange(
  storeIds: string[],
  from: Date,
  to: Date,
): Promise<number> {
  return prisma.dispute.count({
    where: {
      storeId: { in: storeIds },
      createdAt: { gte: from, lte: to },
    },
  })
}

export async function getSellerBalanceSnapshot(storeIds: string[]): Promise<{
  availableAmount: Decimal
  pendingAmount: Decimal
  paidOutAmount: Decimal
} | null> {
  const aggregate = await prisma.sellerBalance.aggregate({
    where: { storeId: { in: storeIds } },
    _sum: {
      availableAmount: true,
      pendingAmount: true,
      paidOutAmount: true,
    },
  })

  if (
    aggregate._sum.availableAmount == null &&
    aggregate._sum.pendingAmount == null &&
    aggregate._sum.paidOutAmount == null
  ) {
    return null
  }

  return {
    availableAmount: toDecimal(aggregate._sum.availableAmount),
    pendingAmount: toDecimal(aggregate._sum.pendingAmount),
    paidOutAmount: toDecimal(aggregate._sum.paidOutAmount),
  }
}
