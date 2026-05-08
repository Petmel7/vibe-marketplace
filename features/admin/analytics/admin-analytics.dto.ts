export interface TopSellerDto {
  sellerId: string
  storeName: string
  revenue: string
  orderCount: number
}

export interface TopProductDto {
  productId: string
  name: string
  totalSold: number
  revenue: string
}

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
}
