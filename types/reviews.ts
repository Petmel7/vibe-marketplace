export type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'HIDDEN'
export type ReviewModerationAction = 'approve' | 'reject' | 'hide' | 'restore'

export interface ReviewRatingSummary {
  averageRating: number
  totalCount: number
  rating1Count: number
  rating2Count: number
  rating3Count: number
  rating4Count: number
  rating5Count: number
}

export interface ProductReview {
  id: string
  productId: string
  productName: string
  storeId: string
  storeName: string
  userId: string
  userDisplayName: string | null
  orderItemId: string | null
  status: ReviewStatus
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

export interface ProductReviewList {
  items: ProductReview[]
  total: number
  page: number
  limit: number
  averageRating: number | null
  ratingSummary: ReviewRatingSummary
}

export interface AdminReviewList {
  items: ProductReview[]
  total: number
  page: number
  limit: number
}

export interface ReviewMutationResult {
  id: string
}

export interface ReviewFormInput {
  rating: number
  title?: string
  comment?: string | null
  pros?: string | null
  cons?: string | null
}
