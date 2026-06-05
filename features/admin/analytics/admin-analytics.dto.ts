import type {
  AnalyticsRiskSummaryDto,
  AnalyticsSeriesPointDto,
  AnalyticsTopCategoryDto,
  AnalyticsTopProductDto,
  AnalyticsTopSellerDto,
} from '@/features/analytics/analytics.dto'

export type TopSellerDto = AnalyticsTopSellerDto

export type TopProductDto = AnalyticsTopProductDto

export interface ModerationStatsDto {
  pendingSellerApprovals: number
  pendingProductApprovals: number
  suspendedSellers: number
  rejectedProducts: number
}

export interface AdminAnalyticsDto {
  gmv: string
  totalOrders: number
  totalSellers: number
  totalBuyers: number
  totalProducts: number
  topSellers: TopSellerDto[]
  topProducts: TopProductDto[]
  sellerGrowthLast30Days: number
  orderGrowthLast30Days: number
  moderationStats: ModerationStatsDto
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
  riskSummary: AnalyticsRiskSummaryDto
  topCategories: AnalyticsTopCategoryDto[]
  revenueSeries: AnalyticsSeriesPointDto[]
  orderSeries: AnalyticsSeriesPointDto[]
  sellerGrowthSeries: AnalyticsSeriesPointDto[]
  refundSeries: AnalyticsSeriesPointDto[]
  disputeSeries: AnalyticsSeriesPointDto[]
  commissionSeries: AnalyticsSeriesPointDto[]
}
