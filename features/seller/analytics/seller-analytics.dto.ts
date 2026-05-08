export type TopProductEntry = {
  productId: string
  name: string
  totalSold: number
  revenue: string
}

export type SellerAnalyticsDto = {
  totalRevenue: string
  totalOrders: number
  totalProductsSold: number
  topProducts: TopProductEntry[]
  revenueLast30Days: string
}
