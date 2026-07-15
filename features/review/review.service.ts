import { NotificationType, ReviewStatus, UserRole } from '@/app/generated/prisma/client'
import { requireAdmin, requireBuyer, requireSeller } from '@/lib/auth/guards'
import type { SessionUser } from '@/features/auth/auth.dto'
import { createAdminNotification, notifyUser } from '@/features/notifications/notifications.service'
import { scheduleProductMetricsRecalculation } from '@/features/products/product-metrics.jobs'
import { recordReviewHiddenRiskSignal } from '@/features/risk/risk.service'
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
  type PublishedReviewRecord,
  type ReviewRecord,
} from './review.repository'
import { logError } from '@/utils/logger'

const DEFAULT_CREATE_REVIEW_STATUS = ReviewStatus.PENDING

function runNonBlocking(label: string, task: Promise<unknown>) {
  void task.catch((error) => {
    logError(label, error)
  })
}

function resolveUserDisplayName(
  review: Pick<ReviewRecord, 'user'> | Pick<PublishedReviewRecord, 'user'>,
): string | null {
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

function toReviewDto(review: ReviewRecord | PublishedReviewRecord): ReviewDto {
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
  scheduleProductMetricsRecalculation({
    reason: 'review-created',
    dedupeKey: `product-metrics:review-created:${review.id}`,
  })

  runNonBlocking(
    'review:create:admin-notification',
    createAdminNotification({
      title: 'Новий відгук очікує перевірки',
      message: `Покупець залишив відгук до товару "${review.product.name}".`,
      actionUrl: '/admin/reviews',
      metadata: {
        reviewId: review.id,
        productId: review.productId,
        storeId: review.product.store.id,
        sellerId: review.product.store.ownerId,
        buyerId: review.userId,
        status: review.status,
        rating: review.rating,
        roleTarget: 'admin',
        actorRole: 'BUYER',
      },
    }),
  )

  runNonBlocking(
    'review:create:seller-notification',
    notifyUser({
      userId: review.product.store.ownerId,
      type: NotificationType.ADMIN_ALERT,
      title: 'Новий відгук до вашого товару',
      message: `Покупець залишив відгук до товару "${review.product.name}".`,
      actionUrl: '/seller/reviews',
      metadata: {
        reviewId: review.id,
        productId: review.productId,
        storeId: review.product.store.id,
        buyerId: review.userId,
        status: review.status,
        rating: review.rating,
        roleTarget: 'seller',
        actorRole: 'BUYER',
      },
    }),
  )

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
  scheduleProductMetricsRecalculation({
    reason: 'review-updated',
    dedupeKey: `product-metrics:review-updated:${updated.id}:${updated.updatedAt.toISOString()}`,
  })
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
  scheduleProductMetricsRecalculation({
    reason: 'review-deleted',
    dedupeKey: `product-metrics:review-deleted:${review.id}`,
  })

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
  const isFirstSellerReply = !review.sellerReply?.trim()

  const updated = await updateSellerReply(reviewId, input)

  if (isFirstSellerReply) {
    runNonBlocking(
      'review:reply:first-reply-notification',
      notifyUser({
        userId: updated.userId,
        type: NotificationType.ADMIN_ALERT,
        title: 'Продавець відповів на ваш відгук',
        message: `Продавець залишив відповідь до відгуку про товар "${updated.product.name}".`,
        actionUrl: `/products/${updated.productId}`,
        metadata: {
          reviewId: updated.id,
          productId: updated.productId,
          storeId: updated.product.store.id,
          sellerId: updated.product.store.ownerId,
          buyerId: updated.userId,
          roleTarget: 'buyer',
          actorRole: 'SELLER',
        },
      }),
    )
  }

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
  scheduleProductMetricsRecalculation({
    reason: 'review-moderated',
    dedupeKey: `product-metrics:review-moderated:${updated.id}:${updated.updatedAt.toISOString()}`,
  })

  if (updated.status === ReviewStatus.PUBLISHED) {
    runNonBlocking(
      'review:moderate:published-notification',
      notifyUser({
        userId: updated.userId,
        type: NotificationType.ADMIN_ALERT,
        title: 'Ваш відгук опубліковано',
        message: `Відгук до товару "${updated.product.name}" тепер опубліковано.`,
        actionUrl: `/products/${updated.productId}`,
        metadata: {
          reviewId: updated.id,
          productId: updated.productId,
          status: updated.status,
          roleTarget: 'buyer',
          actorRole: 'ADMIN',
        },
      }),
    )
  }

  if (updated.status === ReviewStatus.REJECTED) {
    runNonBlocking(
      'review:moderate:rejected-notification',
      notifyUser({
        userId: updated.userId,
        type: NotificationType.ADMIN_ALERT,
        title: 'Ваш відгук відхилено',
        message: `Відгук до товару "${updated.product.name}" не пройшов модерацію.`,
        actionUrl: `/products/${updated.productId}`,
        metadata: {
          reviewId: updated.id,
          productId: updated.productId,
          status: updated.status,
          moderationReason: updated.moderationReason,
          roleTarget: 'buyer',
          actorRole: 'ADMIN',
        },
      }),
    )
  }

  if (updated.status === ReviewStatus.HIDDEN) {
    void recordReviewHiddenRiskSignal({
      reviewId: updated.id,
      reviewerUserId: updated.userId,
      storeId: updated.product.store.id,
      productId: updated.productId,
      reason: updated.moderationReason,
    }).catch((error) => {
      logError('review:moderate-risk-signal', error)
    })
  }
  return toReviewDto(updated)
}
