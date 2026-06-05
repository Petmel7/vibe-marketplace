export type AnalyticsSeriesPointDto = {
  date: string
  label: string
  value: string | number
  secondaryValue?: string | number
}

export type AnalyticsTopProductDto = {
  productId: string
  name: string
  totalSold: number
  revenue: string
}

export type AnalyticsTopSellerDto = {
  sellerId: string
  storeId: string
  storeName: string
  revenue: string
  orderCount: number
}

export type AnalyticsTopCategoryDto = {
  categoryId: string | null
  name: string
  totalSold: number
  revenue: string
}

export type AnalyticsRiskSummaryDto = {
  low: number
  medium: number
  high: number
  critical: number
}
