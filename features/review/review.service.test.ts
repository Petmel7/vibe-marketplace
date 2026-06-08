import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReviewStatus, UserRole } from '@/app/generated/prisma/client'
import {
  ReviewAlreadyExistsError,
  ReviewModerationReasonRequiredError,
  ReviewOwnershipError,
  ReviewPurchaseRequiredError,
  ReviewSelfReviewForbiddenError,
} from '@/lib/errors/review'
import type { SessionUser } from '@/features/auth/auth.dto'
import * as productMetricsJobs from '@/features/products/product-metrics.jobs'
import * as reviewRepository from './review.repository'
import * as riskService from '@/features/risk/risk.service'
import {
  createReview,
  deleteMyReview,
  getAdminReviews,
  getMyReviews,
  getReviewEligibility,
  listReviews,
  moderateReview,
  replyToReview,
  updateMyReview,
} from './review.service'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('./review.repository')
vi.mock('@/features/risk/risk.service')
vi.mock('@/features/products/product-metrics.jobs', () => ({
  scheduleProductMetricsRecalculation: vi.fn(),
}))
vi.mock('@/lib/auth/guards', () => ({
  requireBuyer: vi.fn(),
  requireSeller: vi.fn(),
  requireAdmin: vi.fn(),
}))

const mockRepository = vi.mocked(reviewRepository)
const mockRiskService = vi.mocked(riskService)
const mockProductMetricsJobs = vi.mocked(productMetricsJobs)

const buyerUser: SessionUser = {
  id: 'buyer-1',
  email: 'buyer@example.com',
  roles: [UserRole.BUYER],
}

const sellerUser: SessionUser = {
  id: 'seller-1',
  email: 'seller@example.com',
  roles: [UserRole.SELLER],
}

const adminUser: SessionUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  roles: [UserRole.ADMIN],
}

function makeReviewRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'review-1',
    productId: 'product-1',
    userId: buyerUser.id,
    orderItemId: 'order-item-1',
    status: ReviewStatus.PUBLISHED,
    rating: 5,
    title: 'Amazing',
    comment: 'Great purchase',
    pros: 'Fast delivery',
    cons: null,
    sellerReply: null,
    sellerRepliedAt: null,
    moderatedAt: null,
    moderatedBy: null,
    moderationReason: null,
    isVerifiedPurchase: true,
    createdAt: new Date('2026-06-01T12:00:00.000Z'),
    updatedAt: new Date('2026-06-01T12:00:00.000Z'),
    user: {
      name: 'Buyer Name',
      profile: {
        displayName: 'Buyer Display',
      },
    },
    product: {
      id: 'product-1',
      name: 'Summer Dress',
      store: {
        id: 'store-1',
        name: 'Dress Store',
        ownerId: sellerUser.id,
      },
    },
    ...overrides,
  }
}

function makeRatingSummary(overrides: Record<string, unknown> = {}) {
  return {
    productId: 'product-1',
    ratingAvg: {
      toNumber: () => 4.5,
    },
    ratingCount: 4,
    rating1Count: 0,
    rating2Count: 0,
    rating3Count: 1,
    rating4Count: 0,
    rating5Count: 3,
    updatedAt: new Date('2026-06-01T12:00:00.000Z'),
    ...overrides,
  }
}

describe('review.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRiskService.recordReviewHiddenRiskSignal.mockResolvedValue(null as never)
  })

  it('returns a safe ineligible state for anonymous review eligibility', async () => {
    const result = await getReviewEligibility(null, 'product-1')

    expect(result).toEqual({
      canReview: false,
      hasReviewed: false,
      reason: 'UNAUTHENTICATED',
      eligibleOrderItemId: null,
    })
    expect(mockRepository.findProductReviewContext).not.toHaveBeenCalled()
  })

  it('returns canReview true for an eligible purchased buyer', async () => {
    mockRepository.findProductReviewContext.mockResolvedValue({
      id: 'product-1',
      name: 'Summer Dress',
      imageUrl: 'https://example.com/legacy.jpg',
      store: {
        id: 'store-1',
        name: 'Dress Store',
        ownerId: sellerUser.id,
      },
    } as never)
    mockRepository.findReviewByProductAndUser.mockResolvedValue(null)
    mockRepository.findEligiblePurchasedOrderItem.mockResolvedValue({ id: 'order-item-1' })

    const result = await getReviewEligibility(buyerUser, 'product-1')

    expect(result).toEqual({
      canReview: true,
      hasReviewed: false,
      reason: null,
      eligibleOrderItemId: 'order-item-1',
    })
  })

  it('returns purchase required for a non-purchaser review eligibility check', async () => {
    mockRepository.findProductReviewContext.mockResolvedValue({
      id: 'product-1',
      name: 'Summer Dress',
      imageUrl: null,
      store: {
        id: 'store-1',
        name: 'Dress Store',
        ownerId: sellerUser.id,
      },
    } as never)
    mockRepository.findReviewByProductAndUser.mockResolvedValue(null)
    mockRepository.findEligiblePurchasedOrderItem.mockResolvedValue(null)

    const result = await getReviewEligibility(buyerUser, 'product-1')

    expect(result).toEqual({
      canReview: false,
      hasReviewed: false,
      reason: 'PURCHASE_REQUIRED',
      eligibleOrderItemId: null,
    })
  })

  it('returns self-review forbidden for the product owner eligibility check', async () => {
    mockRepository.findProductReviewContext.mockResolvedValue({
      id: 'product-1',
      name: 'Summer Dress',
      imageUrl: null,
      store: {
        id: 'store-1',
        name: 'Dress Store',
        ownerId: buyerUser.id,
      },
    } as never)

    const result = await getReviewEligibility(buyerUser, 'product-1')

    expect(result).toEqual({
      canReview: false,
      hasReviewed: false,
      reason: 'SELF_REVIEW_FORBIDDEN',
      eligibleOrderItemId: null,
    })
    expect(mockRepository.findReviewByProductAndUser).not.toHaveBeenCalled()
  })

  it('returns already reviewed when the buyer has an existing review', async () => {
    mockRepository.findProductReviewContext.mockResolvedValue({
      id: 'product-1',
      name: 'Summer Dress',
      imageUrl: null,
      store: {
        id: 'store-1',
        name: 'Dress Store',
        ownerId: sellerUser.id,
      },
    } as never)
    mockRepository.findReviewByProductAndUser.mockResolvedValue(makeReviewRecord() as never)

    const result = await getReviewEligibility(buyerUser, 'product-1')

    expect(result).toEqual({
      canReview: false,
      hasReviewed: true,
      reason: 'ALREADY_REVIEWED',
      eligibleOrderItemId: 'order-item-1',
    })
    expect(mockRepository.findEligiblePurchasedOrderItem).not.toHaveBeenCalled()
  })

  it('returns only published reviews publicly and includes rating summary', async () => {
    mockRepository.findPublishedReviewsByProductId.mockResolvedValue({
      items: [makeReviewRecord()],
      total: 1,
    })
    mockRepository.findRatingSummaryByProductId.mockResolvedValue(makeRatingSummary() as never)

    const result = await listReviews('product-1', { page: 1, limit: 10 })

    expect(mockRepository.findPublishedReviewsByProductId).toHaveBeenCalledWith('product-1', {
      page: 1,
      limit: 10,
    })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.status).toBe('PUBLISHED')
    expect(result.averageRating).toBe(4.5)
    expect(result.ratingSummary.totalCount).toBe(4)
  })

  it('requires a verified purchase before allowing review creation', async () => {
    mockRepository.findProductReviewContext.mockResolvedValue({
      id: 'product-1',
      name: 'Summer Dress',
      store: {
        id: 'store-1',
        name: 'Dress Store',
        ownerId: sellerUser.id,
      },
    } as never)
    mockRepository.findReviewByProductAndUser.mockResolvedValue(null)
    mockRepository.findEligiblePurchasedOrderItem.mockResolvedValue(null)

    await expect(
      createReview(buyerUser, 'product-1', { rating: 5, comment: 'Nice' }),
    ).rejects.toThrow(ReviewPurchaseRequiredError)
  })

  it('blocks seller self-review for own product', async () => {
    mockRepository.findProductReviewContext.mockResolvedValue({
      id: 'product-1',
      name: 'Summer Dress',
      store: {
        id: 'store-1',
        name: 'Dress Store',
        ownerId: buyerUser.id,
      },
    } as never)

    await expect(
      createReview(buyerUser, 'product-1', { rating: 5, comment: 'Nice' }),
    ).rejects.toThrow(ReviewSelfReviewForbiddenError)
  })

  it('blocks duplicate review per product and user', async () => {
    mockRepository.findProductReviewContext.mockResolvedValue({
      id: 'product-1',
      name: 'Summer Dress',
      store: {
        id: 'store-1',
        name: 'Dress Store',
        ownerId: sellerUser.id,
      },
    } as never)
    mockRepository.findReviewByProductAndUser.mockResolvedValue(makeReviewRecord() as never)

    await expect(
      createReview(buyerUser, 'product-1', { rating: 5, comment: 'Nice' }),
    ).rejects.toThrow(ReviewAlreadyExistsError)
  })

  it('creates a pending verified-purchase review and recalculates summary', async () => {
    mockRepository.findProductReviewContext.mockResolvedValue({
      id: 'product-1',
      name: 'Summer Dress',
      store: {
        id: 'store-1',
        name: 'Dress Store',
        ownerId: sellerUser.id,
      },
    } as never)
    mockRepository.findReviewByProductAndUser.mockResolvedValue(null)
    mockRepository.findEligiblePurchasedOrderItem.mockResolvedValue({ id: 'order-item-1' })
    mockRepository.createReviewRecord.mockResolvedValue(
      makeReviewRecord({ status: ReviewStatus.PENDING }) as never,
    )
    mockRepository.recalculateProductRatingSummary.mockResolvedValue(makeRatingSummary() as never)

    const result = await createReview(buyerUser, 'product-1', {
      rating: 5,
      title: 'Amazing',
      comment: 'Great purchase',
    })

    expect(mockRepository.createReviewRecord).toHaveBeenCalledWith({
      productId: 'product-1',
      userId: buyerUser.id,
      orderItemId: 'order-item-1',
      status: ReviewStatus.PENDING,
      data: {
        rating: 5,
        title: 'Amazing',
        comment: 'Great purchase',
      },
    })
    expect(mockRepository.recalculateProductRatingSummary).toHaveBeenCalledWith('product-1')
    expect(mockProductMetricsJobs.scheduleProductMetricsRecalculation).toHaveBeenCalledWith({
      reason: 'review-created',
      dedupeKey: 'product-metrics:review-created:review-1',
    })
    expect(result.status).toBe('PENDING')
    expect(result.isVerifiedPurchase).toBe(true)
  })

  it('updates own review, resets moderation state, and recalculates summary', async () => {
    mockRepository.findReviewById.mockResolvedValue(
      makeReviewRecord({
        status: ReviewStatus.REJECTED,
        sellerReply: 'Old reply',
        sellerRepliedAt: new Date('2026-06-01T13:00:00.000Z'),
      }) as never,
    )
    mockRepository.updateReviewRecord.mockResolvedValue(
      makeReviewRecord({
        status: ReviewStatus.PENDING,
        title: 'Updated',
        sellerReply: null,
        sellerRepliedAt: null,
      }) as never,
    )
    mockRepository.recalculateProductRatingSummary.mockResolvedValue(makeRatingSummary() as never)

    const result = await updateMyReview(buyerUser, 'review-1', {
      title: 'Updated',
    })

    expect(mockRepository.updateReviewRecord).toHaveBeenCalledWith(
      'review-1',
      expect.objectContaining({
        title: 'Updated',
        status: ReviewStatus.PENDING,
        moderatedAt: null,
        moderatedBy: null,
        moderationReason: null,
        sellerReply: null,
        sellerRepliedAt: null,
      }),
    )
    expect(mockProductMetricsJobs.scheduleProductMetricsRecalculation).toHaveBeenCalledWith({
      reason: 'review-updated',
      dedupeKey: 'product-metrics:review-updated:review-1:2026-06-01T12:00:00.000Z',
    })
    expect(result.status).toBe('PENDING')
  })

  it('allows only the review owner to delete a review', async () => {
    mockRepository.findReviewById.mockResolvedValue(
      makeReviewRecord({ userId: 'other-user' }) as never,
    )

    await expect(deleteMyReview(buyerUser, 'review-1')).rejects.toThrow(ReviewOwnershipError)
  })

  it('allows seller reply only for reviews on own store products', async () => {
    mockRepository.findReviewById.mockResolvedValue(
      makeReviewRecord({
        product: {
          id: 'product-1',
          name: 'Summer Dress',
          store: {
            id: 'store-1',
            name: 'Dress Store',
            ownerId: 'other-seller',
          },
        },
      }) as never,
    )

    await expect(
      replyToReview(sellerUser, 'review-1', { sellerReply: 'Thanks' }),
    ).rejects.toThrow(ReviewOwnershipError)
  })

  it('allows seller reply for own store review', async () => {
    mockRepository.findReviewById.mockResolvedValue(makeReviewRecord() as never)
    mockRepository.updateSellerReply.mockResolvedValue(
      makeReviewRecord({
        sellerReply: 'Thanks for the feedback',
        sellerRepliedAt: new Date('2026-06-01T15:00:00.000Z'),
      }) as never,
    )

    const result = await replyToReview(sellerUser, 'review-1', {
      sellerReply: 'Thanks for the feedback',
    })

    expect(mockRepository.updateSellerReply).toHaveBeenCalledWith('review-1', {
      sellerReply: 'Thanks for the feedback',
    })
    expect(result.sellerReply).toBe('Thanks for the feedback')
  })

  it('returns paginated admin reviews', async () => {
    mockRepository.listAdminReviews.mockResolvedValue({
      items: [makeReviewRecord({ status: ReviewStatus.HIDDEN })],
      total: 1,
    })

    const result = await getAdminReviews(adminUser, { page: 1, limit: 20, status: ReviewStatus.HIDDEN })

    expect(mockRepository.listAdminReviews).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: ReviewStatus.HIDDEN,
    })
    expect(result.items[0]?.status).toBe('HIDDEN')
  })

  it('returns only the current buyer review list with product snapshot fields', async () => {
    mockRepository.listReviewsByUserId.mockResolvedValue({
      items: [
        {
          id: 'review-1',
          productId: 'product-1',
          rating: 5,
          status: ReviewStatus.PUBLISHED,
          title: 'Amazing',
          comment: 'Great purchase',
          sellerReply: 'Thanks!',
          createdAt: new Date('2026-06-01T12:00:00.000Z'),
          updatedAt: new Date('2026-06-02T12:00:00.000Z'),
          product: {
            id: 'product-1',
            name: 'Summer Dress',
            imageUrl: 'https://example.com/legacy.jpg',
            images: [
              {
                id: 'image-1',
                url: 'https://example.com/primary.jpg',
                isPrimary: true,
                position: 0,
                createdAt: new Date('2026-06-01T10:00:00.000Z'),
              },
            ],
          },
        },
      ],
      total: 1,
    })

    const result = await getMyReviews(buyerUser, { page: 1, limit: 20 })

    expect(mockRepository.listReviewsByUserId).toHaveBeenCalledWith(buyerUser.id, {
      page: 1,
      limit: 20,
    })
    expect(result).toEqual({
      items: [
        {
          id: 'review-1',
          productId: 'product-1',
          productName: 'Summer Dress',
          productImageUrl: 'https://example.com/primary.jpg',
          rating: 5,
          status: 'PUBLISHED',
          title: 'Amazing',
          comment: 'Great purchase',
          sellerReply: 'Thanks!',
          createdAt: '2026-06-01T12:00:00.000Z',
          updatedAt: '2026-06-02T12:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    })
  })

  it('requires moderation reason when rejecting a review', async () => {
    mockRepository.findReviewById.mockResolvedValue(makeReviewRecord() as never)

    await expect(
      moderateReview(adminUser, 'review-1', { action: 'reject' }),
    ).rejects.toThrow(ReviewModerationReasonRequiredError)
  })

  it('moderates a review and recalculates rating summary', async () => {
    mockRepository.findReviewById.mockResolvedValue(
      makeReviewRecord({ status: ReviewStatus.PENDING }) as never,
    )
    mockRepository.updateReviewRecord.mockResolvedValue(
      makeReviewRecord({
        status: ReviewStatus.PUBLISHED,
        moderatedAt: new Date('2026-06-01T16:00:00.000Z'),
        moderatedBy: adminUser.id,
      }) as never,
    )
    mockRepository.recalculateProductRatingSummary.mockResolvedValue(makeRatingSummary() as never)

    const result = await moderateReview(adminUser, 'review-1', {
      action: 'approve',
    })

    expect(mockRepository.updateReviewRecord).toHaveBeenCalledWith(
      'review-1',
      expect.objectContaining({
        status: ReviewStatus.PUBLISHED,
        moderatedBy: adminUser.id,
      }),
    )
    expect(mockRepository.recalculateProductRatingSummary).toHaveBeenCalledWith('product-1')
    expect(result.status).toBe('PUBLISHED')
  })

  it('records a review-hidden risk signal when admin hides a review', async () => {
    mockRepository.findReviewById.mockResolvedValue(
      makeReviewRecord({ status: ReviewStatus.PUBLISHED }) as never,
    )
    mockRepository.updateReviewRecord.mockResolvedValue(
      makeReviewRecord({
        status: ReviewStatus.HIDDEN,
        moderatedAt: new Date('2026-06-01T16:30:00.000Z'),
        moderatedBy: adminUser.id,
        moderationReason: 'Spam content',
      }) as never,
    )
    mockRepository.recalculateProductRatingSummary.mockResolvedValue(makeRatingSummary() as never)

    const result = await moderateReview(adminUser, 'review-1', {
      action: 'hide',
      moderationReason: 'Spam content',
    })

    expect(mockRiskService.recordReviewHiddenRiskSignal).toHaveBeenCalledWith({
      reviewId: 'review-1',
      reviewerUserId: buyerUser.id,
      storeId: 'store-1',
      productId: 'product-1',
      reason: 'Spam content',
    })
    expect(result.status).toBe('HIDDEN')
  })
})
