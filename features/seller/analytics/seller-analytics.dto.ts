import type {
  AnalyticsSeriesPointDto,
  AnalyticsTopProductDto,
} from '@/features/analytics/analytics.dto'

export type TopProductEntry = AnalyticsTopProductDto

export type SellerAnalyticsDto = {
  totalRevenue: string
  totalOrders: number
  totalProductsSold: number
  topProducts: TopProductEntry[]
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
  revenueSeries: AnalyticsSeriesPointDto[]
  orderSeries: AnalyticsSeriesPointDto[]
  fulfillmentSeries: AnalyticsSeriesPointDto[]
}
