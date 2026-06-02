export type ReviewStatusDto = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'HIDDEN'
export type ReviewModerationActionDto = 'approve' | 'reject' | 'hide' | 'restore'
export type ReviewEligibilityReasonDto =
  | 'UNAUTHENTICATED'
  | 'BUYER_ROLE_REQUIRED'
  | 'PURCHASE_REQUIRED'
  | 'SELF_REVIEW_FORBIDDEN'
  | 'ALREADY_REVIEWED'

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

export interface ReviewEligibilityDto {
  canReview: boolean
  hasReviewed: boolean
  reason: ReviewEligibilityReasonDto | null
  eligibleOrderItemId: string | null
}

export interface MyReviewDto {
  id: string
  productId: string
  productName: string
  productImageUrl: string | null
  rating: number
  status: ReviewStatusDto
  title: string | null
  comment: string | null
  sellerReply: string | null
  createdAt: string
  updatedAt: string
}

export interface MyReviewListDto {
  items: MyReviewDto[]
  total: number
  page: number
  limit: number
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
