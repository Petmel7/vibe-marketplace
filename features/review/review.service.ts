import { ReviewStatus, UserRole } from '@/app/generated/prisma/client'
import { requireAdmin, requireBuyer, requireSeller } from '@/lib/auth/guards'
import type { SessionUser } from '@/features/auth/auth.dto'
import {
  ReviewAlreadyExistsError,
  ReviewModerationReasonRequiredError,
  ReviewNotFoundError,
  ReviewOwnershipError,
  ReviewProductNotFoundError,
  ReviewPurchaseRequiredError,
  ReviewSelfReviewForbiddenError,
} from '@/lib/errors/review'
import type {
  AdminReviewListDto,
  MyReviewDto,
  MyReviewListDto,
  ReviewEligibilityDto,
  ReviewDto,
  ReviewListDto,
  ReviewMutationResultDto,
  ReviewRatingSummaryDto,
} from './review.dto'
import type {
  AdminReviewListQuery,
  MyReviewListQuery,
  ReviewCreateInput,
  ReviewListQuery,
  ReviewModerationInput,
  ReviewUpdateInput,
  SellerReplyInput,
} from './review.schema'
import {
  createReviewRecord,
  deleteReviewRecord,
  findEligiblePurchasedOrderItem,
  findProductReviewContext,
  findPublishedReviewsByProductId,
  findRatingSummaryByProductId,
  findReviewById,
  findReviewByProductAndUser,
  listAdminReviews,
  listReviewsByUserId,
  recalculateProductRatingSummary,
  updateReviewRecord,
  updateSellerReply,
  type MyReviewRecord,
  type ReviewRecord,
} from './review.repository'

const DEFAULT_CREATE_REVIEW_STATUS = ReviewStatus.PENDING

function resolveUserDisplayName(review: ReviewRecord): string | null {
  return review.user.profile?.displayName ?? review.user.name ?? null
}

function toRatingSummaryDto(summary: {
  ratingAvg: { toNumber(): number } | number
  ratingCount: number
  rating1Count: number
  rating2Count: number
  rating3Count: number
  rating4Count: number
  rating5Count: number
} | null): ReviewRatingSummaryDto {
  if (!summary) {
    return {
      averageRating: 0,
      totalCount: 0,
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 0,
      rating4Count: 0,
      rating5Count: 0,
    }
  }

  const average =
    typeof summary.ratingAvg === 'number' ? summary.ratingAvg : summary.ratingAvg.toNumber()

  return {
    averageRating: Number(average.toFixed(2)),
    totalCount: summary.ratingCount,
    rating1Count: summary.rating1Count,
    rating2Count: summary.rating2Count,
    rating3Count: summary.rating3Count,
    rating4Count: summary.rating4Count,
    rating5Count: summary.rating5Count,
  }
}

function toReviewDto(review: ReviewRecord): ReviewDto {
  return {
    id: review.id,
    productId: review.productId,
    productName: review.product.name,
    storeId: review.product.store.id,
    storeName: review.product.store.name,
    userId: review.userId,
    userDisplayName: resolveUserDisplayName(review),
    orderItemId: review.orderItemId,
    status: review.status,
    rating: review.rating,
    title: review.title ?? null,
    comment: review.comment ?? null,
    pros: review.pros ?? null,
    cons: review.cons ?? null,
    sellerReply: review.sellerReply ?? null,
    sellerRepliedAt: review.sellerRepliedAt?.toISOString() ?? null,
    moderatedAt: review.moderatedAt?.toISOString() ?? null,
    moderatedBy: review.moderatedBy ?? null,
    moderationReason: review.moderationReason ?? null,
    isVerifiedPurchase: review.isVerifiedPurchase,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  }
}

function resolveMyReviewProductImageUrl(review: MyReviewRecord): string | null {
  return review.product.images[0]?.url ?? review.product.imageUrl ?? null
}

function toMyReviewDto(review: MyReviewRecord): MyReviewDto {
  return {
    id: review.id,
    productId: review.productId,
    productName: review.product.name,
    productImageUrl: resolveMyReviewProductImageUrl(review),
    rating: review.rating,
    status: review.status,
    title: review.title ?? null,
    comment: review.comment ?? null,
    sellerReply: review.sellerReply ?? null,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  }
}

function assertReviewOwner(review: ReviewRecord | null, userId: string): asserts review is ReviewRecord {
  if (!review) {
    throw new ReviewNotFoundError()
  }

  if (review.userId !== userId) {
    throw new ReviewOwnershipError()
  }
}

function assertSellerOwnsReviewProduct(
  review: ReviewRecord | null,
  sellerUserId: string,
): asserts review is ReviewRecord {
  if (!review) {
    throw new ReviewNotFoundError()
  }

  if (review.product.store.ownerId !== sellerUserId) {
    throw new ReviewOwnershipError('You can reply only to reviews for your own store products')
  }
}

function resolveModeratedStatus(action: ReviewModerationInput['action']): ReviewStatus {
  switch (action) {
    case 'approve':
      return ReviewStatus.PUBLISHED
    case 'reject':
      return ReviewStatus.REJECTED
    case 'hide':
      return ReviewStatus.HIDDEN
    case 'restore':
      return ReviewStatus.PUBLISHED
    default:
      return ReviewStatus.PUBLISHED
  }
}

export async function listReviews(
  productId: string,
  query: ReviewListQuery,
): Promise<ReviewListDto> {
  const { page, limit } = query
  const [{ items, total }, ratingSummaryRecord] = await Promise.all([
    findPublishedReviewsByProductId(productId, { page, limit }),
    findRatingSummaryByProductId(productId),
  ])

  const ratingSummary = toRatingSummaryDto(ratingSummaryRecord)

  return {
    items: items.map(toReviewDto),
    total,
    page,
    limit,
    averageRating: ratingSummary.totalCount > 0 ? ratingSummary.averageRating : null,
    ratingSummary,
  }
}

export async function getReviewEligibility(
  user: SessionUser | null,
  productId: string,
): Promise<ReviewEligibilityDto> {
  if (!user) {
    return {
      canReview: false,
      hasReviewed: false,
      reason: 'UNAUTHENTICATED',
      eligibleOrderItemId: null,
    }
  }

  if (!user.roles.includes(UserRole.BUYER)) {
    return {
      canReview: false,
      hasReviewed: false,
      reason: 'BUYER_ROLE_REQUIRED',
      eligibleOrderItemId: null,
    }
  }

  const product = await findProductReviewContext(productId)
  if (!product) {
    throw new ReviewProductNotFoundError()
  }

  if (product.store.ownerId === user.id) {
    return {
      canReview: false,
      hasReviewed: false,
      reason: 'SELF_REVIEW_FORBIDDEN',
      eligibleOrderItemId: null,
    }
  }

  const existingReview = await findReviewByProductAndUser(productId, user.id)
  if (existingReview) {
    return {
      canReview: false,
      hasReviewed: true,
      reason: 'ALREADY_REVIEWED',
      eligibleOrderItemId: existingReview.orderItemId,
    }
  }

  const eligibleOrderItem = await findEligiblePurchasedOrderItem(productId, user.id)
  if (!eligibleOrderItem) {
    return {
      canReview: false,
      hasReviewed: false,
      reason: 'PURCHASE_REQUIRED',
      eligibleOrderItemId: null,
    }
  }

  return {
    canReview: true,
    hasReviewed: false,
    reason: null,
    eligibleOrderItemId: eligibleOrderItem.id,
  }
}

export async function getMyReviews(
  user: SessionUser,
  query: MyReviewListQuery,
): Promise<MyReviewListDto> {
  requireBuyer(user)

  const { items, total } = await listReviewsByUserId(user.id, query)

  return {
    items: items.map(toMyReviewDto),
    total,
    page: query.page,
    limit: query.limit,
  }
}

export async function createReview(
  user: SessionUser,
  productId: string,
  input: ReviewCreateInput,
): Promise<ReviewDto> {
  requireBuyer(user)

  const product = await findProductReviewContext(productId)
  if (!product) {
    throw new ReviewProductNotFoundError()
  }

  if (product.store.ownerId === user.id) {
    throw new ReviewSelfReviewForbiddenError()
  }

  const existing = await findReviewByProductAndUser(productId, user.id)
  if (existing) {
    throw new ReviewAlreadyExistsError()
  }

  const eligibleOrderItem = await findEligiblePurchasedOrderItem(productId, user.id)
  if (!eligibleOrderItem) {
    throw new ReviewPurchaseRequiredError()
  }

  const review = await createReviewRecord({
    productId,
    userId: user.id,
    orderItemId: eligibleOrderItem.id,
    status: DEFAULT_CREATE_REVIEW_STATUS,
    data: input,
  })

  await recalculateProductRatingSummary(productId)
  return toReviewDto(review)
}

export async function updateMyReview(
  user: SessionUser,
  reviewId: string,
  input: ReviewUpdateInput,
): Promise<ReviewDto> {
  requireBuyer(user)

  const review = await findReviewById(reviewId)
  assertReviewOwner(review, user.id)

  const updated = await updateReviewRecord(reviewId, {
    ...(input.rating !== undefined ? { rating: input.rating } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.comment !== undefined ? { comment: input.comment } : {}),
    ...(input.pros !== undefined ? { pros: input.pros } : {}),
    ...(input.cons !== undefined ? { cons: input.cons } : {}),
    status: ReviewStatus.PENDING,
    moderatedAt: null,
    moderatedBy: null,
    moderationReason: null,
    sellerReply: null,
    sellerRepliedAt: null,
  })

  await recalculateProductRatingSummary(updated.productId)
  return toReviewDto(updated)
}

export async function deleteMyReview(
  user: SessionUser,
  reviewId: string,
): Promise<ReviewMutationResultDto> {
  requireBuyer(user)

  const review = await findReviewById(reviewId)
  assertReviewOwner(review, user.id)

  await deleteReviewRecord(reviewId)
  await recalculateProductRatingSummary(review.productId)

  return { id: reviewId }
}

export async function replyToReview(
  user: SessionUser,
  reviewId: string,
  input: SellerReplyInput,
): Promise<ReviewDto> {
  requireSeller(user)

  const review = await findReviewById(reviewId)
  assertSellerOwnsReviewProduct(review, user.id)

  const updated = await updateSellerReply(reviewId, input)
  return toReviewDto(updated)
}

export async function getAdminReviews(
  user: SessionUser,
  query: AdminReviewListQuery,
): Promise<AdminReviewListDto> {
  requireAdmin(user)

  const { items, total } = await listAdminReviews(query)

  return {
    items: items.map(toReviewDto),
    total,
    page: query.page,
    limit: query.limit,
  }
}

export async function moderateReview(
  user: SessionUser,
  reviewId: string,
  input: ReviewModerationInput,
): Promise<ReviewDto> {
  requireAdmin(user)

  const review = await findReviewById(reviewId)
  if (!review) {
    throw new ReviewNotFoundError()
  }

  if ((input.action === 'reject' || input.action === 'hide') && !input.moderationReason?.trim()) {
    throw new ReviewModerationReasonRequiredError()
  }

  const updated = await updateReviewRecord(reviewId, {
    status: resolveModeratedStatus(input.action),
    moderatedAt: new Date(),
    moderatedBy: user.id,
    moderationReason:
      input.action === 'approve' || input.action === 'restore'
        ? null
        : input.moderationReason?.trim() ?? null,
  })

  await recalculateProductRatingSummary(updated.productId)
  return toReviewDto(updated)
}
