import { OrderStatus, Prisma, ReviewStatus } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type { AdminReviewListQuery, ReviewCreateInput, SellerReplyInput } from './review.schema'

const REVIEW_SELECT = {
  id: true,
  productId: true,
  userId: true,
  orderItemId: true,
  status: true,
  rating: true,
  title: true,
  comment: true,
  pros: true,
  cons: true,
  sellerReply: true,
  sellerRepliedAt: true,
  moderatedAt: true,
  moderatedBy: true,
  moderationReason: true,
  isVerifiedPurchase: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      name: true,
      profile: {
        select: {
          displayName: true,
        },
      },
    },
  },
  product: {
    select: {
      id: true,
      name: true,
      store: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    },
  },
} satisfies Prisma.ReviewSelect

const PRODUCT_REVIEW_CONTEXT_SELECT = {
  id: true,
  name: true,
  store: {
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  },
} satisfies Prisma.ProductSelect

const PUBLISHED_REVIEW_WHERE = {
  status: ReviewStatus.PUBLISHED,
} satisfies Prisma.ReviewWhereInput

const REVIEW_ELIGIBLE_ORDER_STATUSES = [
  OrderStatus.confirmed,
  OrderStatus.paid,
  OrderStatus.processing,
  OrderStatus.shipped,
  OrderStatus.delivered,
  OrderStatus.refunded,
] as const

export type ReviewRecord = Prisma.ReviewGetPayload<{
  select: typeof REVIEW_SELECT
}>

export type ProductReviewContext = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_REVIEW_CONTEXT_SELECT
}>

type ProductRatingSummaryRecord = Prisma.ProductRatingSummaryGetPayload<{
  select: {
    productId: true
    ratingAvg: true
    ratingCount: true
    rating1Count: true
    rating2Count: true
    rating3Count: true
    rating4Count: true
    rating5Count: true
    updatedAt: true
  }
}>

function buildAdminReviewWhere(query: AdminReviewListQuery): Prisma.ReviewWhereInput {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
  }
}

export async function findProductReviewContext(productId: string): Promise<ProductReviewContext | null> {
  return prisma.product.findUnique({
    where: { id: productId },
    select: PRODUCT_REVIEW_CONTEXT_SELECT,
  })
}

export async function findPublishedReviewsByProductId(
  productId: string,
  params: { page: number; limit: number },
): Promise<{ items: ReviewRecord[]; total: number }> {
  const { page, limit } = params
  const skip = (page - 1) * limit

  const where: Prisma.ReviewWhereInput = {
    productId,
    ...PUBLISHED_REVIEW_WHERE,
  }

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: limit,
      select: REVIEW_SELECT,
    }),
    prisma.review.count({ where }),
  ])

  return { items, total }
}

export async function findRatingSummaryByProductId(
  productId: string,
): Promise<ProductRatingSummaryRecord | null> {
  return prisma.productRatingSummary.findUnique({
    where: { productId },
    select: {
      productId: true,
      ratingAvg: true,
      ratingCount: true,
      rating1Count: true,
      rating2Count: true,
      rating3Count: true,
      rating4Count: true,
      rating5Count: true,
      updatedAt: true,
    },
  })
}

export async function findReviewByProductAndUser(
  productId: string,
  userId: string,
): Promise<ReviewRecord | null> {
  return prisma.review.findUnique({
    where: {
      productId_userId: {
        productId,
        userId,
      },
    },
    select: REVIEW_SELECT,
  })
}

export async function findReviewById(id: string): Promise<ReviewRecord | null> {
  return prisma.review.findUnique({
    where: { id },
    select: REVIEW_SELECT,
  })
}

export async function findEligiblePurchasedOrderItem(
  productId: string,
  userId: string,
): Promise<{ id: string } | null> {
  return prisma.orderItem.findFirst({
    where: {
      review: null,
      variant: {
        productId,
      },
      order: {
        userId,
        status: {
          in: [...REVIEW_ELIGIBLE_ORDER_STATUSES],
        },
      },
    },
    select: {
      id: true,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
}

export async function createReviewRecord(input: {
  productId: string
  userId: string
  orderItemId: string
  status: ReviewStatus
  data: ReviewCreateInput
}): Promise<ReviewRecord> {
  return prisma.review.create({
    data: {
      productId: input.productId,
      userId: input.userId,
      orderItemId: input.orderItemId,
      status: input.status,
      rating: input.data.rating,
      title: input.data.title?.trim() || null,
      comment: input.data.comment?.trim() || null,
      pros: input.data.pros?.trim() || null,
      cons: input.data.cons?.trim() || null,
      isVerifiedPurchase: true,
    },
    select: REVIEW_SELECT,
  })
}

export async function updateReviewRecord(
  id: string,
  data: {
    rating?: number
    title?: string | null
    comment?: string | null
    pros?: string | null
    cons?: string | null
    status?: ReviewStatus
    moderatedAt?: Date | null
    moderatedBy?: string | null
    moderationReason?: string | null
    sellerReply?: string | null
    sellerRepliedAt?: Date | null
  },
): Promise<ReviewRecord> {
  return prisma.review.update({
    where: { id },
    data: {
      ...(data.rating !== undefined ? { rating: data.rating } : {}),
      ...(data.title !== undefined ? { title: data.title?.trim() || null } : {}),
      ...(data.comment !== undefined ? { comment: data.comment?.trim() || null } : {}),
      ...(data.pros !== undefined ? { pros: data.pros?.trim() || null } : {}),
      ...(data.cons !== undefined ? { cons: data.cons?.trim() || null } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.moderatedAt !== undefined ? { moderatedAt: data.moderatedAt } : {}),
      ...(data.moderatedBy !== undefined ? { moderatedBy: data.moderatedBy } : {}),
      ...(data.moderationReason !== undefined
        ? { moderationReason: data.moderationReason?.trim() || null }
        : {}),
      ...(data.sellerReply !== undefined ? { sellerReply: data.sellerReply?.trim() || null } : {}),
      ...(data.sellerRepliedAt !== undefined ? { sellerRepliedAt: data.sellerRepliedAt } : {}),
    },
    select: REVIEW_SELECT,
  })
}

export async function deleteReviewRecord(id: string): Promise<void> {
  await prisma.review.delete({
    where: { id },
  })
}

export async function updateSellerReply(
  id: string,
  input: SellerReplyInput,
): Promise<ReviewRecord> {
  return prisma.review.update({
    where: { id },
    data: {
      sellerReply: input.sellerReply.trim(),
      sellerRepliedAt: new Date(),
    },
    select: REVIEW_SELECT,
  })
}

export async function listAdminReviews(
  query: AdminReviewListQuery,
): Promise<{ items: ReviewRecord[]; total: number }> {
  const { page, limit } = query
  const skip = (page - 1) * limit
  const where = buildAdminReviewWhere(query)

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: limit,
      select: REVIEW_SELECT,
    }),
    prisma.review.count({ where }),
  ])

  return { items, total }
}

export async function recalculateProductRatingSummary(
  productId: string,
): Promise<ProductRatingSummaryRecord> {
  const [aggregate, grouped] = await Promise.all([
    prisma.review.aggregate({
      where: {
        productId,
        ...PUBLISHED_REVIEW_WHERE,
      },
      _avg: {
        rating: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.review.groupBy({
      by: ['rating'],
      where: {
        productId,
        ...PUBLISHED_REVIEW_WHERE,
      },
      _count: {
        _all: true,
      },
    }),
  ])

  const counts = new Map<number, number>()
  for (const item of grouped) {
    counts.set(item.rating, item._count._all)
  }

  return prisma.productRatingSummary.upsert({
    where: { productId },
    update: {
      ratingAvg: new Prisma.Decimal(aggregate._avg.rating ?? 0),
      ratingCount: aggregate._count._all,
      rating1Count: counts.get(1) ?? 0,
      rating2Count: counts.get(2) ?? 0,
      rating3Count: counts.get(3) ?? 0,
      rating4Count: counts.get(4) ?? 0,
      rating5Count: counts.get(5) ?? 0,
      updatedAt: new Date(),
    },
    create: {
      productId,
      ratingAvg: new Prisma.Decimal(aggregate._avg.rating ?? 0),
      ratingCount: aggregate._count._all,
      rating1Count: counts.get(1) ?? 0,
      rating2Count: counts.get(2) ?? 0,
      rating3Count: counts.get(3) ?? 0,
      rating4Count: counts.get(4) ?? 0,
      rating5Count: counts.get(5) ?? 0,
    },
    select: {
      productId: true,
      ratingAvg: true,
      ratingCount: true,
      rating1Count: true,
      rating2Count: true,
      rating3Count: true,
      rating4Count: true,
      rating5Count: true,
      updatedAt: true,
    },
  })
}
