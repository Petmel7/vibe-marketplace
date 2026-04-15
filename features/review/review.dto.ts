/**
 * Data Transfer Objects for the Review feature.
 */

export interface ReviewDto {
  id: string
  productId: string
  userId: string
  rating: number
  comment: string | null
  createdAt: string
}

export interface ReviewListDto {
  items: ReviewDto[]
  total: number
  page: number
  limit: number
  /** Mean rating across ALL reviews for the product (not just this page). Null when no reviews exist. */
  averageRating: number | null
}
