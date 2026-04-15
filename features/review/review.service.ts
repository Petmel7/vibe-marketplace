import {
  findReviews,
  findReview,
  createReview as repositoryCreateReview,
  productExists,
} from '@/features/review/review.repository'
import type { ReviewDto, ReviewListDto } from '@/features/review/review.dto'
import type { ReviewCreateInput, ReviewListQuery } from '@/features/review/review.schema'
import type { Review } from '@/app/generated/prisma/client'

// ---------------------------------------------------------------------------
// Typed application errors
// ---------------------------------------------------------------------------

export class ProductNotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const

  constructor(productId: string) {
    super(`Product "${productId}" was not found or is not active`)
    this.name = 'ProductNotFoundError'
  }
}

export class ReviewAlreadyExistsError extends Error {
  readonly code = 'REVIEW_ALREADY_EXISTS' as const

  constructor(productId: string) {
    super(`You have already submitted a review for product "${productId}"`)
    this.name = 'ReviewAlreadyExistsError'
  }
}

// ---------------------------------------------------------------------------
// DTO mapper
// ---------------------------------------------------------------------------

function toReviewDto(review: Review): ReviewDto {
  return {
    id: review.id,
    productId: review.productId,
    userId: review.userId,
    rating: review.rating,
    comment: review.comment ?? null,
    createdAt: review.createdAt.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * List reviews for a product, newest-first with pagination.
 * Also returns the aggregate average rating across all reviews.
 *
 * No auth required — reviews are publicly visible.
 * Returns empty items (not an error) when the product has no reviews.
 */
export async function listReviews(
  productId: string,
  query: ReviewListQuery,
): Promise<ReviewListDto> {
  const { page, limit } = query

  const { items, total, averageRating } = await findReviews(productId, { page, limit })

  return {
    items: items.map(toReviewDto),
    total,
    page,
    limit,
    averageRating,
  }
}

/**
 * Create a review for a product.
 *
 * Throws:
 *   ProductNotFoundError     — product does not exist or is not active
 *   ReviewAlreadyExistsError — user has already reviewed this product
 */
export async function createReview(
  productId: string,
  userId: string,
  input: ReviewCreateInput,
): Promise<ReviewDto> {
  if (!(await productExists(productId))) {
    throw new ProductNotFoundError(productId)
  }

  const existing = await findReview(productId, userId)
  if (existing) {
    throw new ReviewAlreadyExistsError(productId)
  }

  const review = await repositoryCreateReview(productId, userId, input)
  return toReviewDto(review)
}
