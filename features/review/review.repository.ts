import { prisma } from '@/lib/prisma'
import type { Review } from '@/app/generated/prisma/client'
export { productExists } from '@/lib/db/productExists'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FindReviewsParams {
  page: number
  limit: number
}

interface FindReviewsResult {
  items: Review[]
  total: number
  /** Mean rating across ALL reviews for this product, or null if none exist. */
  averageRating: number | null
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Return a paginated list of reviews for a product, newest-first.
 * Also computes the aggregate average rating over all reviews (not just this page).
 *
 * N+1 note: items, count, and aggregate run in parallel via Promise.all.
 */
export async function findReviews(
  productId: string,
  params: FindReviewsParams,
): Promise<FindReviewsResult> {
  const { page, limit } = params
  const skip = (page - 1) * limit

  const [items, total, aggregate] = await Promise.all([
    prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.review.count({ where: { productId } }),
    prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
    }),
  ])

  const avg = aggregate._avg.rating
  return {
    items,
    total,
    averageRating: avg != null ? Math.round(avg * 10) / 10 : null,
  }
}

/**
 * Find a single review by product + user composite key.
 * Returns null when the user has not yet reviewed this product.
 */
export async function findReview(
  productId: string,
  userId: string,
): Promise<Review | null> {
  return prisma.review.findUnique({
    where: { productId_userId: { productId, userId } },
  })
}

/**
 * Insert a new review row and return it.
 * Caller must verify no duplicate exists and the product is active.
 */
export async function createReview(
  productId: string,
  userId: string,
  data: { rating: number; comment?: string },
): Promise<Review> {
  return prisma.review.create({
    data: {
      productId,
      userId,
      rating: data.rating,
      comment: data.comment ?? null,
    },
  })
}

