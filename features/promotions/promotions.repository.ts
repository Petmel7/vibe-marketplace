import { Prisma, PromotionType } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { PromotionDuplicateCodeError } from '@/lib/errors/promotion'
import type { PromotionQueryDto } from './promotions.dto'

const promotionSummaryInclude = {
  _count: {
    select: {
      usages: true,
      orderPromotions: true,
    },
  },
} satisfies Prisma.PromotionInclude

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

function buildPromotionWhere(query: Partial<PromotionQueryDto>): Prisma.PromotionWhereInput {
  return {
    ...(query.type ? { type: query.type } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.code
      ? {
          code: {
            contains: query.code,
          },
        }
      : {}),
  }
}

export async function listPromotions(query: PromotionQueryDto) {
  return prisma.promotion.findMany({
    where: buildPromotionWhere(query),
    include: promotionSummaryInclude,
    orderBy: [{ createdAt: 'desc' }],
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })
}

export async function countPromotions(query: PromotionQueryDto) {
  return prisma.promotion.count({
    where: buildPromotionWhere(query),
  })
}

export async function findPromotionById(id: string) {
  return prisma.promotion.findUnique({
    where: { id },
    include: promotionSummaryInclude,
  })
}

export async function findPromotionByCode(code: string) {
  return prisma.promotion.findUnique({
    where: { code },
    include: promotionSummaryInclude,
  })
}

export async function listAutomaticPromotions(now: Date) {
  return prisma.promotion.findMany({
    where: {
      type: PromotionType.AUTOMATIC_DISCOUNT,
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    include: promotionSummaryInclude,
    orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function createPromotion(data: Prisma.PromotionUncheckedCreateInput) {
  try {
    return await prisma.promotion.create({
      data,
      include: promotionSummaryInclude,
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new PromotionDuplicateCodeError()
    }

    throw error
  }
}

export async function updatePromotion(
  id: string,
  data: Prisma.PromotionUncheckedUpdateInput,
) {
  try {
    return await prisma.promotion.update({
      where: { id },
      data,
      include: promotionSummaryInclude,
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new PromotionDuplicateCodeError()
    }

    throw error
  }
}

export async function deletePromotion(id: string) {
  return prisma.promotion.delete({
    where: { id },
  })
}

export async function countPromotionUsages(promotionId: string) {
  return prisma.promotionUsage.count({
    where: { promotionId },
  })
}

export async function countPromotionUsagesByUser(
  promotionId: string,
  userId: string,
) {
  return prisma.promotionUsage.count({
    where: {
      promotionId,
      userId,
    },
  })
}
