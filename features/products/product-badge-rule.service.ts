import Decimal from 'decimal.js'
import { ProductBadgeType, UserRole, type ProductBadgeRule } from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import { enqueueProductMetricsJob } from '@/features/jobs/jobs.queue'
import { logError } from '@/utils/logger'
import type {
  ProductBadgeRuleDto,
  ProductBadgeRuleListDto,
  UpdateHitBadgeRuleDto,
} from './product-badge.dto'
import {
  findAllBadgeRules,
  findBadgeRuleByType,
  updateBadgeRuleByType,
} from './product-badge-rule.repository'
import {
  BadgeRuleNotFoundError,
  InvalidBadgeRuleError,
  UnauthorizedBadgeRuleMutationError,
} from '@/lib/errors/product'

function ensureAdmin(user: SessionUser) {
  if (!user.roles.includes(UserRole.ADMIN)) {
    throw new UnauthorizedBadgeRuleMutationError()
  }
}

function toProductBadgeRuleDto(rule: ProductBadgeRule): ProductBadgeRuleDto {
  return {
    id: rule.id,
    badgeType: rule.badgeType,
    minViews: rule.minViews,
    minWishlists: rule.minWishlists,
    minSoldCount: rule.minSoldCount,
    minRevenueAmount: rule.minRevenueAmount.toString(),
    enabled: rule.enabled,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
    updatedBy: rule.updatedBy,
  }
}

function validateActiveHitRule(input: {
  minViews: number
  minWishlists: number
  minSoldCount: number
  minRevenueAmount: Decimal
  enabled: boolean
}) {
  if (!input.enabled) {
    return
  }

  const hasPositiveThreshold =
    input.minViews > 0 ||
    input.minWishlists > 0 ||
    input.minSoldCount > 0 ||
    input.minRevenueAmount.greaterThan(0)

  if (!hasPositiveThreshold) {
    throw new InvalidBadgeRuleError('Enabled HIT badge rules must define at least one positive threshold')
  }
}

export async function getAdminBadgeRules(user: SessionUser): Promise<ProductBadgeRuleListDto> {
  ensureAdmin(user)
  const rules = await findAllBadgeRules()

  return {
    items: rules.map(toProductBadgeRuleDto),
  }
}

export async function getActiveHitBadgeRule() {
  return findBadgeRuleByType(ProductBadgeType.HIT)
}

export async function updateHitBadgeRule(
  user: SessionUser,
  input: UpdateHitBadgeRuleDto,
): Promise<ProductBadgeRuleDto> {
  ensureAdmin(user)

  const existingRule = await findBadgeRuleByType(ProductBadgeType.HIT)
  if (!existingRule) {
    throw new BadgeRuleNotFoundError('HIT badge rule not found')
  }

  const nextRule = {
    minViews: input.minViews ?? existingRule.minViews,
    minWishlists: input.minWishlists ?? existingRule.minWishlists,
    minSoldCount: input.minSoldCount ?? existingRule.minSoldCount,
    minRevenueAmount: new Decimal(input.minRevenueAmount ?? existingRule.minRevenueAmount),
    enabled: input.enabled ?? existingRule.enabled,
  }

  validateActiveHitRule(nextRule)

  const updatedRule = await updateBadgeRuleByType({
    badgeType: ProductBadgeType.HIT,
    minViews: input.minViews,
    minWishlists: input.minWishlists,
    minSoldCount: input.minSoldCount,
    minRevenueAmount: input.minRevenueAmount !== undefined ? new Decimal(input.minRevenueAmount) : undefined,
    enabled: input.enabled,
    updatedBy: user.id,
  })

  void enqueueProductMetricsJob({}, {
    dedupeKey: `product-metrics:badge-rule:${ProductBadgeType.HIT}`,
  }).catch((error) => {
    logError('product-badge-rule:enqueue-product-metrics-job', error, {
      domain: 'products',
      badgeType: ProductBadgeType.HIT,
    })
  })

  return toProductBadgeRuleDto(updatedRule)
}
