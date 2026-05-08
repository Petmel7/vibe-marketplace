export interface SellerModerationDto {
  id: string
  userId: string
  businessName: string | null
  verificationStatus: string
  moderationReason: string | null
  moderatedAt: Date | null
  moderatedBy: string | null
  createdAt: Date
}

export interface SellerModerationQueueDto {
  items: SellerModerationDto[]
  total: number
  page: number
  limit: number
}

export interface SellerModerationFilters {
  page: number
  limit: number
}
