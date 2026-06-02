export type ReviewStatusDto = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'HIDDEN'
export type ReviewModerationActionDto = 'approve' | 'reject' | 'hide' | 'restore'

export interface ReviewRatingSummaryDto {
  averageRating: number
  totalCount: number
  rating1Count: number
  rating2Count: number
  rating3Count: number
  rating4Count: number
  rating5Count: number
}

export interface ReviewDto {
  id: string
  productId: string
  productName: string
  storeId: string
  storeName: string
  userId: string
  userDisplayName: string | null
  orderItemId: string | null
  status: ReviewStatusDto
  rating: number
  title: string | null
  comment: string | null
  pros: string | null
  cons: string | null
  sellerReply: string | null
  sellerRepliedAt: string | null
  moderatedAt: string | null
  moderatedBy: string | null
  moderationReason: string | null
  isVerifiedPurchase: boolean
  createdAt: string
  updatedAt: string
}

export interface ReviewListDto {
  items: ReviewDto[]
  total: number
  page: number
  limit: number
  averageRating: number | null
  ratingSummary: ReviewRatingSummaryDto
}

export interface ReviewMutationResultDto {
  id: string
}

export interface AdminReviewListDto {
  items: ReviewDto[]
  total: number
  page: number
  limit: number
}
