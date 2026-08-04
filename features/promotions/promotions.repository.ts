import { Prisma, PromotionOwnerType, PromotionType } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { PromotionDuplicateCodeError } from '@/lib/errors/promotion'
import {
  resolveRepositoryClient,
  type RepositoryContext,
} from '@/lib/repository/context'
import type { PromotionQueryDto, PromotionTargetInputDto } from './promotions.dto'

const promotionSummaryInclude = {
  store: {
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  },
  targets: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
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
    ...(query.storeId ? { storeId: query.storeId } : {}),
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

export async function listSellerPromotions(ownerId: string, query: PromotionQueryDto) {
  return prisma.promotion.findMany({
    where: {
      ...buildPromotionWhere(query),
      ownerType: PromotionOwnerType.SELLER,
      store: {
        ownerId,
      },
    },
    include: promotionSummaryInclude,
    orderBy: [{ createdAt: 'desc' }],
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })
}

export async function countSellerPromotions(ownerId: string, query: PromotionQueryDto) {
  return prisma.promotion.count({
    where: {
      ...buildPromotionWhere(query),
      ownerType: PromotionOwnerType.SELLER,
      store: {
        ownerId,
      },
    },
  })
}

export async function findPromotionById(id: string) {
  return prisma.promotion.findUnique({
    where: { id },
    include: promotionSummaryInclude,
  })
}

export async function findSellerPromotionById(ownerId: string, id: string) {
  return prisma.promotion.findFirst({
    where: {
      id,
      ownerType: PromotionOwnerType.SELLER,
      store: {
        ownerId,
      },
    },
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

export async function listActiveVisiblePromotionsForProductDisplay(input: {
  now: Date
  productIds: string[]
  storeIds: string[]
  categoryIds: string[]
}) {
  const sellerTargetFilters: Prisma.PromotionTargetWhereInput[] = [
    {
      targetType: 'STORE',
      targetId: {
        in: input.storeIds,
      },
    },
    {
      targetType: 'PRODUCT',
      targetId: {
        in: input.productIds,
      },
    },
  ]

  if (input.categoryIds.length > 0) {
    sellerTargetFilters.push({
      targetType: 'CATEGORY',
      targetId: {
        in: input.categoryIds,
      },
    })
  }

  return prisma.promotion.findMany({
    where: {
      isActive: true,
      startsAt: {
        lte: input.now,
      },
      OR: [{ endsAt: null }, { endsAt: { gte: input.now } }],
      AND: [
        {
          OR: [
            {
              ownerType: PromotionOwnerType.MARKETPLACE,
              type: PromotionType.AUTOMATIC_DISCOUNT,
            },
            {
              ownerType: PromotionOwnerType.SELLER,
              storeId: {
                in: input.storeIds,
              },
              targets: {
                some: {
                  OR: sellerTargetFilters,
                },
              },
            },
          ],
        },
      ],
    },
    include: {
      targets: {
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      },
    },
    orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function createPromotion(
  data: Prisma.PromotionUncheckedCreateInput & {
    targets?: PromotionTargetInputDto[]
  },
) {
  try {
    const { targets, ...promotionData } = data

    return await prisma.promotion.create({
      data: {
        ...promotionData,
        ...(targets?.length
          ? {
              targets: {
                create: targets.map((target) => ({
                  targetType: target.targetType,
                  targetId: target.targetId,
                })),
              },
            }
          : {}),
      },
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

export async function replacePromotionTargets(
  promotionId: string,
  targets: PromotionTargetInputDto[],
  context?: RepositoryContext,
) {
  const db = resolveRepositoryClient(context)
  await db.promotionTarget.deleteMany({
    where: { promotionId },
  })

  if (targets.length > 0) {
    await db.promotionTarget.createMany({
      data: targets.map((target) => ({
        promotionId,
        targetType: target.targetType,
        targetId: target.targetId,
      })),
    })
  }

  return db.promotion.findUnique({
    where: { id: promotionId },
    include: promotionSummaryInclude,
  })
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

export async function findOwnedStoreById(ownerId: string, storeId: string) {
  return prisma.store.findFirst({
    where: {
      id: storeId,
      ownerId,
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  })
}

export async function findOwnedProductsInStoreByIds(storeId: string, productIds: string[]) {
  return prisma.product.findMany({
    where: {
      storeId,
      id: { in: productIds },
    },
    select: {
      id: true,
      categoryId: true,
    },
  })
}

export async function findStoreProductCategoryIds(storeId: string, categoryIds: string[]) {
  const products = await prisma.product.findMany({
    where: {
      storeId,
      categoryId: { in: categoryIds },
    },
    select: {
      categoryId: true,
    },
    distinct: ['categoryId'],
  })

  return products.map((product) => product.categoryId).filter((value): value is string => Boolean(value))
}
