import Decimal from 'decimal.js'
import {
  Prisma,
  OrderStatus,
  RefundRequestStatus,
  RiskLevel,
} from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type { AnalyticsInterval } from '@/features/analytics/analytics.helpers'
import { measureServerOperation } from '@/lib/observability/server-timing'
import type {
  AnalyticsTopCategoryDto,
  AnalyticsTopProductDto,
  AnalyticsTopSellerDto,
} from '@/features/analytics/analytics.dto'

export type AnalyticsBucketValueRow = {
  bucket: Date
  value: Decimal
  secondaryValue?: Decimal
}

export type AdminOrderMetrics = {
  gmv: Decimal
  ordersTotal: number
  paidOrders: number
  codOrders: number
  failedPayments: number
}

export type AdminCommissionMetrics = {
  commissionRevenue: Decimal
  netSellerRevenue: Decimal
}

export type AdminRefundMetrics = {
  refundCount: number
  refundAmount: Decimal
}

type DecimalLike = Prisma.Decimal | Decimal | string | number | bigint | null | undefined
type NumberLike = string | number | bigint | null | undefined

type SeriesRow = {
  bucket: Date
  value: DecimalLike
  secondaryValue?: DecimalLike
}

type AdminOrderMetricsRow = {
  gmv: DecimalLike
  ordersTotal: NumberLike
  paidOrders: NumberLike
  codOrders: NumberLike
  failedPayments: NumberLike
}

type AdminCommissionMetricsRow = {
  commissionRevenue: DecimalLike
  netSellerRevenue: DecimalLike
}

type TopSellerRow = {
  sellerId: string
  storeId: string
  storeName: string
  revenue: DecimalLike
  orderCount: NumberLike
}

type TopProductRow = {
  productId: string
  name: string
  totalSold: NumberLike
  revenue: DecimalLike
}

type TopCategoryRow = {
  categoryId: string | null
  name: string
  totalSold: NumberLike
  revenue: DecimalLike
}

const GMV_ORDER_STATUSES: OrderStatus[] = [
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

function getBucketExpression(interval: AnalyticsInterval, columnName: string) {
  const trunc =
    interval === 'day' ? 'day' : interval === 'week' ? 'week' : 'month'

  return Prisma.raw(`date_trunc('${trunc}', ${columnName} AT TIME ZONE 'UTC')`)
}

function gmvStatusFilterSql() {
  return Prisma.sql`IN (${Prisma.join(GMV_ORDER_STATUSES)})`
}

function mapSeriesRows(rows: SeriesRow[]): AnalyticsBucketValueRow[] {
  return rows.map((row) => ({
    bucket: row.bucket,
    value: toDecimal(row.value),
    secondaryValue: row.secondaryValue != null ? toDecimal(row.secondaryValue) : undefined,
  }))
}

export async function getGMV(): Promise<Decimal> {
  const result = await measureServerOperation(
    'adminAnalytics.getGMV',
    {
      repository: 'features/admin/analytics/admin-analytics.repository',
      sql: 'prisma.order.aggregate(sum totalAmount by GMV statuses)',
    },
    () =>
      prisma.order.aggregate({
        where: {
          status: { in: GMV_ORDER_STATUSES },
        },
        _sum: { totalAmount: true },
      }),
  )
  return new Decimal(result._sum?.totalAmount?.toString() ?? '0')
}

export async function getTotalOrderCount(): Promise<number> {
  return measureServerOperation(
    'adminAnalytics.getTotalOrderCount',
    {
      repository: 'features/admin/analytics/admin-analytics.repository',
      sql: 'prisma.order.count',
    },
    () => prisma.order.count(),
  )
}

export async function getTotalSellerCount(): Promise<number> {
  return measureServerOperation(
    'adminAnalytics.getTotalSellerCount',
    {
      repository: 'features/admin/analytics/admin-analytics.repository',
      sql: 'prisma.sellerProfile.count',
    },
    () => prisma.sellerProfile.count(),
  )
}

export async function getTotalBuyerCount(): Promise<number> {
  return measureServerOperation(
    'adminAnalytics.getTotalBuyerCount',
    {
      repository: 'features/admin/analytics/admin-analytics.repository',
      sql: 'prisma.buyerProfile.count',
    },
    () => prisma.buyerProfile.count(),
  )
}

export async function getTotalProductCount(): Promise<number> {
  return measureServerOperation(
    'adminAnalytics.getTotalProductCount',
    {
      repository: 'features/admin/analytics/admin-analytics.repository',
      sql: 'prisma.product.count',
    },
    () => prisma.product.count(),
  )
}

export async function getSellerGrowthLast30Days(): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return measureServerOperation(
    'adminAnalytics.getSellerGrowthLast30Days',
    {
      repository: 'features/admin/analytics/admin-analytics.repository',
      sql: 'prisma.sellerProfile.count(createdAt >= since)',
    },
    () =>
      prisma.sellerProfile.count({
        where: { createdAt: { gte: since } },
      }),
  )
}

export async function getOrderGrowthLast30Days(): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return measureServerOperation(
    'adminAnalytics.getOrderGrowthLast30Days',
    {
      repository: 'features/admin/analytics/admin-analytics.repository',
      sql: 'prisma.order.count(createdAt >= since)',
    },
    () =>
      prisma.order.count({
        where: { createdAt: { gte: since } },
      }),
  )
}

export async function getModerationStats(): Promise<{
  pendingSellerApprovals: number
  pendingProductApprovals: number
  suspendedSellers: number
  rejectedProducts: number
}> {
  const [
    pendingSellerApprovals,
    pendingProductApprovals,
    suspendedSellers,
    rejectedProducts,
  ] = await measureServerOperation(
    'adminAnalytics.getModerationStats',
    {
      repository: 'features/admin/analytics/admin-analytics.repository',
      sql: 'sellerProfile.count x2 + product.count x2',
    },
    () =>
      Promise.all([
        prisma.sellerProfile.count({ where: { verificationStatus: 'PENDING' } }),
        prisma.product.count({ where: { status: 'PENDING_REVIEW' } }),
        prisma.sellerProfile.count({ where: { verificationStatus: 'SUSPENDED' } }),
        prisma.product.count({ where: { status: 'REJECTED' } }),
      ]),
  )

  return {
    pendingSellerApprovals,
    pendingProductApprovals,
    suspendedSellers,
    rejectedProducts,
  }
}

export async function getAdminOrderMetricsForRange(
  from: Date,
  to: Date,
): Promise<AdminOrderMetrics> {
  const [row] = await prisma.$queryRaw<AdminOrderMetricsRow[]>(Prisma.sql`
    SELECT
      COALESCE(SUM(CASE WHEN o.status ${gmvStatusFilterSql()} THEN o.total_amount ELSE 0 END), 0) AS gmv,
      COUNT(*)::int AS "ordersTotal",
      COUNT(*) FILTER (WHERE o.status ${gmvStatusFilterSql()})::int AS "paidOrders",
      COUNT(DISTINCT CASE WHEN p.method = ${'CASH_ON_DELIVERY'} THEN o.id END)::int AS "codOrders",
      COUNT(p.id) FILTER (WHERE p.status = ${'FAILED'})::int AS "failedPayments"
    FROM orders o
    LEFT JOIN payments p ON p.order_id = o.id
    WHERE o.created_at >= ${from}
      AND o.created_at <= ${to}
  `)

  return {
    gmv: toDecimal(row?.gmv),
    ordersTotal: toInteger(row?.ordersTotal),
    paidOrders: toInteger(row?.paidOrders),
    codOrders: toInteger(row?.codOrders),
    failedPayments: toInteger(row?.failedPayments),
  }
}

export async function getAdminRevenueSeriesForRange(
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
    WHERE oi.created_at >= ${from}
      AND oi.created_at <= ${to}
      AND o.status ${gmvStatusFilterSql()}
    GROUP BY 1
    ORDER BY 1
  `)

  return mapSeriesRows(rows)
}

export async function getAdminOrderSeriesForRange(
  from: Date,
  to: Date,
  interval: AnalyticsInterval,
): Promise<AnalyticsBucketValueRow[]> {
  const bucket = getBucketExpression(interval, 'o.created_at')
  const rows = await prisma.$queryRaw<SeriesRow[]>(Prisma.sql`
    SELECT
      ${bucket} AS bucket,
      COUNT(*)::int AS value
    FROM orders o
    WHERE o.created_at >= ${from}
      AND o.created_at <= ${to}
    GROUP BY 1
    ORDER BY 1
  `)

  return mapSeriesRows(rows)
}

export async function getAdminSellerGrowthSeriesForRange(
  from: Date,
  to: Date,
  interval: AnalyticsInterval,
): Promise<AnalyticsBucketValueRow[]> {
  const bucket = getBucketExpression(interval, 'sp.created_at')
  const rows = await prisma.$queryRaw<SeriesRow[]>(Prisma.sql`
    SELECT
      ${bucket} AS bucket,
      COUNT(*)::int AS value
    FROM seller_profiles sp
    WHERE sp.created_at >= ${from}
      AND sp.created_at <= ${to}
    GROUP BY 1
    ORDER BY 1
  `)

  return mapSeriesRows(rows)
}

export async function getSellerGrowthCountForRange(
  from: Date,
  to: Date,
): Promise<number> {
  return prisma.sellerProfile.count({
    where: {
      createdAt: { gte: from, lte: to },
    },
  })
}

export async function getAdminRefundMetricsForRange(
  from: Date,
  to: Date,
): Promise<AdminRefundMetrics> {
  const [count, sum] = await Promise.all([
    prisma.refundRequest.count({
      where: {
        createdAt: { gte: from, lte: to },
      },
    }),
    prisma.refundRequest.aggregate({
      where: {
        createdAt: { gte: from, lte: to },
        status: RefundRequestStatus.SUCCEEDED,
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

export async function getAdminRefundSeriesForRange(
  from: Date,
  to: Date,
  interval: AnalyticsInterval,
): Promise<AnalyticsBucketValueRow[]> {
  const bucket = getBucketExpression(interval, 'rr.created_at')
  const rows = await prisma.$queryRaw<SeriesRow[]>(Prisma.sql`
    SELECT
      ${bucket} AS bucket,
      COUNT(*)::int AS value,
      COALESCE(SUM(CASE WHEN rr.status = ${RefundRequestStatus.SUCCEEDED} THEN rr.amount ELSE 0 END), 0) AS "secondaryValue"
    FROM refund_requests rr
    WHERE rr.created_at >= ${from}
      AND rr.created_at <= ${to}
    GROUP BY 1
    ORDER BY 1
  `)

  return mapSeriesRows(rows)
}

export async function getAdminDisputeCountForRange(
  from: Date,
  to: Date,
): Promise<number> {
  return prisma.dispute.count({
    where: {
      createdAt: { gte: from, lte: to },
    },
  })
}

export async function getAdminDisputeSeriesForRange(
  from: Date,
  to: Date,
  interval: AnalyticsInterval,
): Promise<AnalyticsBucketValueRow[]> {
  const bucket = getBucketExpression(interval, 'd.created_at')
  const rows = await prisma.$queryRaw<SeriesRow[]>(Prisma.sql`
    SELECT
      ${bucket} AS bucket,
      COUNT(*)::int AS value
    FROM disputes d
    WHERE d.created_at >= ${from}
      AND d.created_at <= ${to}
    GROUP BY 1
    ORDER BY 1
  `)

  return mapSeriesRows(rows)
}

export async function getAdminCommissionMetricsForRange(
  from: Date,
  to: Date,
): Promise<AdminCommissionMetrics> {
  const [row] = await prisma.$queryRaw<AdminCommissionMetricsRow[]>(Prisma.sql`
    SELECT
      COALESCE(SUM(pc.commission_amount), 0) AS "commissionRevenue",
      COALESCE(SUM(pc.seller_net_amount), 0) AS "netSellerRevenue"
    FROM platform_commissions pc
    WHERE pc.created_at >= ${from}
      AND pc.created_at <= ${to}
  `)

  return {
    commissionRevenue: toDecimal(row?.commissionRevenue),
    netSellerRevenue: toDecimal(row?.netSellerRevenue),
  }
}

export async function getAdminCommissionSeriesForRange(
  from: Date,
  to: Date,
  interval: AnalyticsInterval,
): Promise<AnalyticsBucketValueRow[]> {
  const bucket = getBucketExpression(interval, 'pc.created_at')
  const rows = await prisma.$queryRaw<SeriesRow[]>(Prisma.sql`
    SELECT
      ${bucket} AS bucket,
      COALESCE(SUM(pc.commission_amount), 0) AS value
    FROM platform_commissions pc
    WHERE pc.created_at >= ${from}
      AND pc.created_at <= ${to}
    GROUP BY 1
    ORDER BY 1
  `)

  return mapSeriesRows(rows)
}

export async function getAdminTopSellersForRange(
  from: Date,
  to: Date,
  limit: number,
): Promise<AnalyticsTopSellerDto[]> {
  const rows = await measureServerOperation(
    'adminAnalytics.getAdminTopSellersForRange',
    {
      repository: 'features/admin/analytics/admin-analytics.repository',
      sql: 'top sellers revenue/orderCount grouped by store_id, owner_id, name',
      limit,
    },
    () =>
      prisma.$queryRaw<TopSellerRow[]>(Prisma.sql`
        SELECT
          s.owner_id::text AS "sellerId",
          oi.store_id::text AS "storeId",
          s.name::text AS "storeName",
          COALESCE(SUM(oi.unit_price_snapshot * oi.quantity), 0) AS revenue,
          COUNT(DISTINCT oi.order_id)::int AS "orderCount"
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN stores s ON s.id = oi.store_id
        WHERE oi.created_at >= ${from}
          AND oi.created_at <= ${to}
          AND o.status ${gmvStatusFilterSql()}
        GROUP BY oi.store_id, s.owner_id, s.name
        ORDER BY revenue DESC, "orderCount" DESC, "storeName" ASC
        LIMIT ${limit}
      `),
  )

  return rows.map((row) => ({
    sellerId: row.sellerId,
    storeId: row.storeId,
    storeName: row.storeName,
    revenue: toDecimal(row.revenue).toFixed(2),
    orderCount: toInteger(row.orderCount),
  }))
}

export async function getAdminTopProductsForRange(
  from: Date,
  to: Date,
  limit: number,
): Promise<AnalyticsTopProductDto[]> {
  const rows = await measureServerOperation(
    'adminAnalytics.getAdminTopProductsForRange',
    {
      repository: 'features/admin/analytics/admin-analytics.repository',
      sql: 'top products grouped by variant_id and product_name_snapshot',
      limit,
    },
    () =>
      prisma.$queryRaw<TopProductRow[]>(Prisma.sql`
        SELECT
          oi.variant_id::text AS "productId",
          oi.product_name_snapshot AS name,
          COALESCE(SUM(oi.quantity), 0)::int AS "totalSold",
          COALESCE(SUM(oi.unit_price_snapshot * oi.quantity), 0) AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.created_at >= ${from}
          AND oi.created_at <= ${to}
          AND o.status ${gmvStatusFilterSql()}
        GROUP BY oi.variant_id, oi.product_name_snapshot
        ORDER BY "totalSold" DESC, revenue DESC, name ASC
        LIMIT ${limit}
      `),
  )

  return rows.map((row) => ({
    productId: row.productId,
    name: row.name,
    totalSold: toInteger(row.totalSold),
    revenue: toDecimal(row.revenue).toFixed(2),
  }))
}

export async function getAdminTopCategoriesForRange(
  from: Date,
  to: Date,
  limit: number,
): Promise<AnalyticsTopCategoryDto[]> {
  const rows = await prisma.$queryRaw<TopCategoryRow[]>(Prisma.sql`
    SELECT
      c.id::text AS "categoryId",
      COALESCE(c.name, 'Uncategorized')::text AS name,
      COALESCE(SUM(oi.quantity), 0)::int AS "totalSold",
      COALESCE(SUM(oi.unit_price_snapshot * oi.quantity), 0) AS revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN product_variants pv ON pv.id = oi.variant_id
    LEFT JOIN products p ON p.id = pv.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE oi.created_at >= ${from}
      AND oi.created_at <= ${to}
      AND o.status ${gmvStatusFilterSql()}
    GROUP BY c.id, COALESCE(c.name, 'Uncategorized')
    ORDER BY revenue DESC, "totalSold" DESC, name ASC
    LIMIT ${limit}
  `)

  return rows.map((row) => ({
    categoryId: row.categoryId,
    name: row.name,
    totalSold: toInteger(row.totalSold),
    revenue: toDecimal(row.revenue).toFixed(2),
  }))
}

export async function getActiveSellerCount(): Promise<number> {
  const [row] = await prisma.$queryRaw<Array<{ value: NumberLike }>>(Prisma.sql`
    SELECT COUNT(DISTINCT s.owner_id)::int AS value
    FROM stores s
    WHERE s.is_active = true
  `)

  return toInteger(row?.value)
}

export async function getPublishedProductCount(): Promise<number> {
  return prisma.product.count({
    where: { status: 'PUBLISHED' },
  })
}

export async function getRiskSummary(): Promise<{
  low: number
  medium: number
  high: number
  critical: number
}> {
  const profiles = await prisma.riskProfile.groupBy({
    by: ['level'],
    _count: { level: true },
  })

  return {
    low: profiles.find((profile) => profile.level === RiskLevel.LOW)?._count.level ?? 0,
    medium: profiles.find((profile) => profile.level === RiskLevel.MEDIUM)?._count.level ?? 0,
    high: profiles.find((profile) => profile.level === RiskLevel.HIGH)?._count.level ?? 0,
    critical: profiles.find((profile) => profile.level === RiskLevel.CRITICAL)?._count.level ?? 0,
  }
}
