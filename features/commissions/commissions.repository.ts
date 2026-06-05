import { CommissionRuleScope, Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type { CommissionRuleQueryDto } from './commissions.dto'

const commissionRuleInclude = {
  store: {
    select: {
      id: true,
      name: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
    },
  },
} satisfies Prisma.CommissionRuleInclude

function buildCommissionRuleWhere(
  query: Partial<CommissionRuleQueryDto>,
): Prisma.CommissionRuleWhereInput {
  return {
    ...(query.scope ? { scope: query.scope } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.storeId ? { storeId: query.storeId } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
  }
}

export async function listCommissionRules(query: CommissionRuleQueryDto) {
  return prisma.commissionRule.findMany({
    where: buildCommissionRuleWhere(query),
    include: commissionRuleInclude,
    orderBy: [{ priority: 'desc' }, { startsAt: 'desc' }, { createdAt: 'desc' }],
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })
}

export async function countCommissionRules(query: CommissionRuleQueryDto) {
  return prisma.commissionRule.count({
    where: buildCommissionRuleWhere(query),
  })
}

export async function findCommissionRuleById(id: string) {
  return prisma.commissionRule.findUnique({
    where: { id },
    include: commissionRuleInclude,
  })
}

export async function createCommissionRule(data: Prisma.CommissionRuleUncheckedCreateInput) {
  return prisma.commissionRule.create({
    data,
    include: commissionRuleInclude,
  })
}

export async function updateCommissionRule(
  id: string,
  data: Prisma.CommissionRuleUncheckedUpdateInput,
) {
  return prisma.commissionRule.update({
    where: { id },
    data,
    include: commissionRuleInclude,
  })
}

export async function findApplicableCommissionRules(input: {
  at: Date
  storeId?: string | null
  categoryId?: string | null
}) {
  const where: Prisma.CommissionRuleWhereInput = {
    isActive: true,
    startsAt: { lte: input.at },
    OR: [
      { endsAt: null },
      { endsAt: { gt: input.at } },
    ],
    AND: [
      {
        OR: [
          { scope: CommissionRuleScope.GLOBAL },
          ...(input.storeId
            ? [{ scope: CommissionRuleScope.STORE, storeId: input.storeId }]
            : []),
          ...(input.categoryId
            ? [{ scope: CommissionRuleScope.CATEGORY, categoryId: input.categoryId }]
            : []),
        ],
      },
    ],
  }

  return prisma.commissionRule.findMany({
    where,
    include: commissionRuleInclude,
    orderBy: [{ priority: 'desc' }, { startsAt: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function findConflictingCommissionRule(input: {
  scope: CommissionRuleScope
  storeId?: string | null
  categoryId?: string | null
  priority: number
  startsAt: Date
  endsAt?: Date | null
  excludeId?: string
}) {
  const newEndsAt = input.endsAt ?? null

  return prisma.commissionRule.findFirst({
    where: {
      ...(input.excludeId ? { NOT: { id: input.excludeId } } : {}),
      isActive: true,
      scope: input.scope,
      priority: input.priority,
      storeId: input.scope === CommissionRuleScope.STORE ? input.storeId ?? null : null,
      categoryId: input.scope === CommissionRuleScope.CATEGORY ? input.categoryId ?? null : null,
      startsAt: {
        lt: newEndsAt ?? new Date('9999-12-31T23:59:59.999Z'),
      },
      OR: [
        { endsAt: null },
        { endsAt: { gt: input.startsAt } },
      ],
    },
    include: commissionRuleInclude,
  })
}

export async function findStoreById(id: string) {
  return prisma.store.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  })
}

export async function findCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
    },
  })
}
