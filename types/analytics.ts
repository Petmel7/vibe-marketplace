export const ANALYTICS_RANGE_VALUES = ['7d', '30d', '90d', '12m', 'custom'] as const
export const ANALYTICS_INTERVAL_VALUES = ['day', 'week', 'month'] as const

export type AnalyticsRange = (typeof ANALYTICS_RANGE_VALUES)[number]
export type AnalyticsInterval = (typeof ANALYTICS_INTERVAL_VALUES)[number]

export type AnalyticsSeriesPoint = {
  date: string
  label: string
  value: string | number
  secondaryValue?: string | number
}

export type AnalyticsTopProduct = {
  productId: string
  name: string
  totalSold: number
  revenue: string
}

export type AnalyticsTopSeller = {
  sellerId: string
  storeId: string
  storeName: string
  revenue: string
  orderCount: number
}

export type AnalyticsTopCategory = {
  categoryId: string | null
  name: string
  totalSold: number
  revenue: string
}

export type AnalyticsRiskSummary = {
  low: number
  medium: number
  high: number
  critical: number
}

export type SellerAnalytics = {
  totalRevenue: string
  totalOrders: number
  totalProductsSold: number
  topProducts: AnalyticsTopProduct[]
  revenueLast30Days: string
  revenueTotal: string
  revenuePreviousPeriod: string
  revenueGrowthPercent: number | null
  ordersTotal: number
  ordersPreviousPeriod: number
  ordersGrowthPercent: number | null
  unitsSold: number
  averageOrderValue: string
  pendingFulfillmentCount: number
  shippedFulfillmentCount: number
  deliveredFulfillmentCount: number
  refundCount: number
  refundAmount: string
  disputeCount: number
  availableBalance: string
  pendingBalance: string
  paidOutAmount: string
  revenueSeries: AnalyticsSeriesPoint[]
  orderSeries: AnalyticsSeriesPoint[]
  fulfillmentSeries: AnalyticsSeriesPoint[]
}

export type AdminModerationStats = {
  pendingSellerApprovals: number
  pendingProductApprovals: number
  suspendedSellers: number
  rejectedProducts: number
}

export type AdminAnalytics = {
  gmv: string
  totalOrders: number
  totalSellers: number
  totalBuyers: number
  totalProducts: number
  topSellers: AnalyticsTopSeller[]
  topProducts: AnalyticsTopProduct[]
  sellerGrowthLast30Days: number
  orderGrowthLast30Days: number
  moderationStats: AdminModerationStats
  gmvPreviousPeriod: string
  gmvGrowthPercent: number | null
  commissionRevenue: string
  netSellerRevenue: string
  ordersTotal: number
  paidOrders: number
  codOrders: number
  failedPayments: number
  refundCount: number
  refundAmount: string
  disputeCount: number
  disputeRate: number
  sellerGrowth: number | null
  activeSellerCount: number
  newSellerCount: number
  productCount: number
  publishedProductCount: number
  moderationQueueCount: number
  riskSummary: AnalyticsRiskSummary
  topCategories: AnalyticsTopCategory[]
  revenueSeries: AnalyticsSeriesPoint[]
  orderSeries: AnalyticsSeriesPoint[]
  sellerGrowthSeries: AnalyticsSeriesPoint[]
  refundSeries: AnalyticsSeriesPoint[]
  disputeSeries: AnalyticsSeriesPoint[]
  commissionSeries: AnalyticsSeriesPoint[]
}

export type AnalyticsUrlState = {
  range: AnalyticsRange
  interval: AnalyticsInterval
  from: string
  to: string
}

export type AnalyticsPageState =
  | { status: 'ready'; filters: AnalyticsUrlState; analytics: SellerAnalytics | AdminAnalytics }
  | { status: 'error'; filters: AnalyticsUrlState; message: string }

function getSingleValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return value ?? ''
}

export function normalizeAnalyticsUrlState(
  searchParams: Record<string, string | string[] | undefined>,
): AnalyticsUrlState {
  const range = getSingleValue(searchParams.range)
  const interval = getSingleValue(searchParams.interval)
  const from = getSingleValue(searchParams.from).trim()
  const to = getSingleValue(searchParams.to).trim()

  return {
    range: ANALYTICS_RANGE_VALUES.includes(range as AnalyticsRange)
      ? (range as AnalyticsRange)
      : '30d',
    interval: ANALYTICS_INTERVAL_VALUES.includes(interval as AnalyticsInterval)
      ? (interval as AnalyticsInterval)
      : 'day',
    from,
    to,
  }
}

export function buildAnalyticsSearchParams(state: AnalyticsUrlState) {
  const params = new URLSearchParams()

  if (state.range !== '30d') {
    params.set('range', state.range)
  }

  if (state.interval !== 'day') {
    params.set('interval', state.interval)
  }

  if (state.range === 'custom') {
    if (state.from) params.set('from', state.from)
    if (state.to) params.set('to', state.to)
  }

  return params
}
