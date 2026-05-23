import Decimal from 'decimal.js'
import { ProductBadgeType } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'

export async function findAllBadgeRules() {
  return prisma.productBadgeRule.findMany({
    orderBy: [{ badgeType: 'asc' }],
  })
}

export async function findBadgeRuleByType(badgeType: ProductBadgeType) {
  return prisma.productBadgeRule.findUnique({
    where: { badgeType },
  })
}

export async function updateBadgeRuleByType(params: {
  badgeType: ProductBadgeType
  minViews?: number
  minWishlists?: number
  minSoldCount?: number
  minRevenueAmount?: Decimal
  enabled?: boolean
  updatedBy: string
}) {
  return prisma.productBadgeRule.update({
    where: { badgeType: params.badgeType },
    data: {
      ...(params.minViews !== undefined ? { minViews: params.minViews } : {}),
      ...(params.minWishlists !== undefined ? { minWishlists: params.minWishlists } : {}),
      ...(params.minSoldCount !== undefined ? { minSoldCount: params.minSoldCount } : {}),
      ...(params.minRevenueAmount !== undefined ? { minRevenueAmount: params.minRevenueAmount } : {}),
      ...(params.enabled !== undefined ? { enabled: params.enabled } : {}),
      updatedBy: params.updatedBy,
      updatedAt: new Date(),
    },
  })
}
