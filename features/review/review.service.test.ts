import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import * as repo from '@/features/review/review.repository'
import * as productExistsLib from '@/lib/db/productExists'
import {
  listReviews,
  createReview,
  ProductNotFoundError,
  ReviewAlreadyExistsError,
} from '@/features/review/review.service'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/features/review/review.repository')
vi.mock('@/lib/db/productExists')

const mockRepo = vi.mocked(repo)
const mockProductExists = vi.mocked(productExistsLib.productExists)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PRODUCT_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const USER_ID    = 'bbbbbbbb-0000-0000-0000-000000000002'
const REVIEW_ID  = 'cccccccc-0000-0000-0000-000000000003'

function makeReview(overrides: Record<string, unknown> = {}) {
  return {
    id: REVIEW_ID,
    productId: PRODUCT_ID,
    userId: USER_ID,
    rating: 4,
    comment: 'Great product!' as string | null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

function makeReviewListResult(items = [makeReview()]) {
  return {
    items,
    total: items.length,
    averageRating: items.length > 0 ? 4.0 : null,
  }
}

// ---------------------------------------------------------------------------
// listReviews
// ---------------------------------------------------------------------------

describe('listReviews', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns paginated reviews with average rating', async () => {
    mockRepo.findReviews.mockResolvedValue(makeReviewListResult())

    const result = await listReviews(PRODUCT_ID, { page: 1, limit: 20 })

    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.averageRating).toBe(4.0)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.items[0].id).toBe(REVIEW_ID)
    expect(result.items[0].rating).toBe(4)
  })

  it('returns empty list when no reviews exist', async () => {
    mockRepo.findReviews.mockResolvedValue(makeReviewListResult([]))

    const result = await listReviews(PRODUCT_ID, { page: 1, limit: 20 })

    expect(result.items).toHaveLength(0)
    expect(result.total).toBe(0)
    expect(result.averageRating).toBeNull()
  })

  it('passes page and limit to the repository', async () => {
    mockRepo.findReviews.mockResolvedValue(makeReviewListResult([]))

    await listReviews(PRODUCT_ID, { page: 3, limit: 10 })

    expect(mockRepo.findReviews).toHaveBeenCalledWith(PRODUCT_ID, { page: 3, limit: 10 })
  })
})

// ---------------------------------------------------------------------------
// createReview
// ---------------------------------------------------------------------------

describe('createReview', () => {
  beforeEach(() => vi.resetAllMocks())

  it('creates a review and returns the DTO', async () => {
    mockProductExists.mockResolvedValue(true)
    mockRepo.findReview.mockResolvedValue(null)
    mockRepo.createReview.mockResolvedValue(makeReview() as never)

    const result = await createReview(PRODUCT_ID, USER_ID, { rating: 4, comment: 'Great product!' })

    expect(mockRepo.createReview).toHaveBeenCalledWith(PRODUCT_ID, USER_ID, {
      rating: 4,
      comment: 'Great product!',
    })
    expect(result.id).toBe(REVIEW_ID)
    expect(result.rating).toBe(4)
    expect(result.createdAt).toBe('2025-01-01T00:00:00.000Z')
  })

  it('throws ProductNotFoundError when product does not exist', async () => {
    mockProductExists.mockResolvedValue(false)

    await expect(createReview(PRODUCT_ID, USER_ID, { rating: 5 }))
      .rejects.toThrow(ProductNotFoundError)
  })

  it('throws ReviewAlreadyExistsError when user already reviewed the product', async () => {
    mockProductExists.mockResolvedValue(true)
    mockRepo.findReview.mockResolvedValue(makeReview() as never)

    await expect(createReview(PRODUCT_ID, USER_ID, { rating: 3 }))
      .rejects.toThrow(ReviewAlreadyExistsError)
  })

  it('does not call createReview repository method when duplicate detected', async () => {
    mockProductExists.mockResolvedValue(true)
    mockRepo.findReview.mockResolvedValue(makeReview() as never)

    await expect(createReview(PRODUCT_ID, USER_ID, { rating: 3 })).rejects.toThrow()
    expect(mockRepo.createReview).not.toHaveBeenCalled()
  })

  it('creates a review without a comment', async () => {
    mockProductExists.mockResolvedValue(true)
    mockRepo.findReview.mockResolvedValue(null)
    mockRepo.createReview.mockResolvedValue(makeReview({ comment: null }) as never)

    const result = await createReview(PRODUCT_ID, USER_ID, { rating: 5 })

    expect(result.comment).toBeNull()
  })
})
