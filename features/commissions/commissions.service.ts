import Decimal from 'decimal.js'
import { CommissionRuleScope } from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import { requireAdmin } from '@/lib/auth/guards'
import {
  CommissionCalculationError,
  CommissionRuleConflictError,
  CommissionRuleNotFoundError,
  InvalidCommissionRuleError,
} from '@/lib/errors/commission'
import { CategoryNotFoundError, StoreNotFoundError } from '@/lib/errors/seller'
import type {
  CommissionRuleDto,
  CommissionRuleListDto,
  CommissionRulePreviewDto,
  CommissionRuleQueryDto,
  CreateCommissionRuleInputDto,
  PreviewCommissionRuleInputDto,
  ResolvedCommissionCalculationDto,
  ResolvedCommissionRuleDto,
  UpdateCommissionRuleInputDto,
  UpdateCommissionRuleStatusInputDto,
} from './commissions.dto'
import {
  countCommissionRules,
  createCommissionRule,
  findApplicableCommissionRules,
  findCategoryById,
  findCommissionRuleById,
  findConflictingCommissionRule,
  findStoreById,
  listCommissionRules,
  updateCommissionRule,
} from './commissions.repository'

const DEFAULT_COMMISSION_RATE = new Decimal(process.env.MARKETPLACE_COMMISSION_RATE ?? '0.10')

type CommissionRuleRecord = NonNullable<Awaited<ReturnType<typeof findCommissionRuleById>>>

function assertAdmin(user: SessionUser) {
  requireAdmin(user)
}

function toNullableString(value: { toString(): string } | null | undefined) {
  return value ? value.toString() : null
}

function toCommissionRuleDto(rule: CommissionRuleRecord): CommissionRuleDto {
  return {
    id: rule.id,
    name: rule.name,
    scope: rule.scope,
    storeId: rule.storeId ?? null,
    storeName: rule.store?.name ?? null,
    categoryId: rule.categoryId ?? null,
    categoryName: rule.category?.name ?? null,
    rate: new Decimal(rule.rate.toString()).toFixed(4),
    startsAt: rule.startsAt.toISOString(),
    endsAt: rule.endsAt?.toISOString() ?? null,
    priority: rule.priority,
    isActive: rule.isActive,
    createdById: rule.createdById,
    createdByEmail: rule.createdBy.email ?? null,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  }
}

function getScopeSpecificity(scope: CommissionRuleScope) {
  switch (scope) {
    case CommissionRuleScope.STORE:
      return 3
    case CommissionRuleScope.CATEGORY:
      return 2
    case CommissionRuleScope.GLOBAL:
    default:
      return 1
  }
}

function resolveWinningRule(
  rules: Awaited<ReturnType<typeof findApplicableCommissionRules>>,
  at: Date,
) {
  const eligibleRules = rules.filter((rule) => {
    if (!rule.isActive) {
      return false
    }

    if (rule.startsAt > at) {
      return false
    }

    if (rule.endsAt != null && rule.endsAt <= at) {
      return false
    }

    return true
  })

  if (eligibleRules.length === 0) {
    return null
  }

  return [...eligibleRules].sort((left, right) => {
    if (left.priority !== right.priority) {
      return right.priority - left.priority
    }

    const specificity = getScopeSpecificity(right.scope) - getScopeSpecificity(left.scope)
    if (specificity !== 0) {
      return specificity
    }

    const startsAtDelta = right.startsAt.getTime() - left.startsAt.getTime()
    if (startsAtDelta !== 0) {
      return startsAtDelta
    }

    return right.createdAt.getTime() - left.createdAt.getTime()
  })[0] ?? null
}

function assertDefaultRate() {
  if (DEFAULT_COMMISSION_RATE.isNegative() || DEFAULT_COMMISSION_RATE.greaterThan(1)) {
    throw new CommissionCalculationError('Commission rate must be between 0 and 1')
  }
}

function assertRuleValues(input: {
  rate: string
  startsAt: Date
  endsAt?: Date | null
}) {
  const rate = new Decimal(input.rate)
  if (!rate.isFinite() || rate.isNegative() || rate.greaterThan(1)) {
    throw new InvalidCommissionRuleError('Rate must be between 0 and 1')
  }

  if (input.endsAt != null && input.endsAt <= input.startsAt) {
    throw new InvalidCommissionRuleError('End date must be later than start date')
  }
}

async function assertScopeReferences(input: {
  scope: CommissionRuleScope
  storeId?: string | null
  categoryId?: string | null
}) {
  if (input.scope === CommissionRuleScope.GLOBAL) {
    if (input.storeId != null || input.categoryId != null) {
      throw new InvalidCommissionRuleError('Global commission rules cannot target a store or category')
    }
  }

  if (input.scope === CommissionRuleScope.STORE) {
    if (!input.storeId) {
      throw new InvalidCommissionRuleError('Store commission rules require a store')
    }

    if (input.categoryId != null) {
      throw new InvalidCommissionRuleError('Store commission rules cannot target a category')
    }

    const store = await findStoreById(input.storeId)
    if (!store) {
      throw new StoreNotFoundError()
    }
  }

  if (input.scope === CommissionRuleScope.CATEGORY) {
    if (!input.categoryId) {
      throw new InvalidCommissionRuleError('Category commission rules require a category')
    }

    if (input.storeId != null) {
      throw new InvalidCommissionRuleError('Category commission rules cannot target a store')
    }

    const category = await findCategoryById(input.categoryId)
    if (!category) {
      throw new CategoryNotFoundError()
    }
  }
}

async function assertNoRuleConflict(input: {
  scope: CommissionRuleScope
  storeId?: string | null
  categoryId?: string | null
  priority: number
  startsAt: Date
  endsAt?: Date | null
  excludeId?: string
  isActive: boolean
}) {
  if (!input.isActive) {
    return
  }

  const conflict = await findConflictingCommissionRule(input)
  if (conflict) {
    throw new CommissionRuleConflictError(
      `Commission rule conflicts with "${conflict.name}" in the same scope and priority window`,
    )
  }
}

function toResolvedRuleDto(rule: CommissionRuleRecord | null, fallbackRate?: Decimal): ResolvedCommissionRuleDto | null {
  if (!rule) {
    if (!fallbackRate) {
      return null
    }

    return {
      id: null,
      name: null,
      scope: null,
      storeId: null,
      categoryId: null,
      rate: fallbackRate.toFixed(4),
    }
  }

  return {
    id: rule.id,
    name: rule.name,
    scope: rule.scope,
    storeId: rule.storeId ?? null,
    categoryId: rule.categoryId ?? null,
    rate: new Decimal(rule.rate.toString()).toFixed(4),
  }
}

export async function resolveCommissionRule(input: {
  storeId?: string | null
  categoryId?: string | null
  at?: Date
}) {
  assertDefaultRate()
  const at = input.at ?? new Date()
  const rules = await findApplicableCommissionRules({
    at,
    storeId: input.storeId ?? null,
    categoryId: input.categoryId ?? null,
  })

  const matchedRule = resolveWinningRule(rules, at) as CommissionRuleRecord | null
  return {
    matchedRule,
    rate: matchedRule ? new Decimal(matchedRule.rate.toString()) : DEFAULT_COMMISSION_RATE,
  }
}

export async function calculateCommissionForAmount(input: {
  storeId?: string | null
  categoryId?: string | null
  grossAmount: Decimal
  at?: Date
}): Promise<ResolvedCommissionCalculationDto> {
  assertDefaultRate()
  if (!input.grossAmount.isFinite() || input.grossAmount.isNegative()) {
    throw new CommissionCalculationError('Gross amount must be a valid non-negative value')
  }

  const { matchedRule, rate } = await resolveCommissionRule({
    storeId: input.storeId,
    categoryId: input.categoryId,
    at: input.at,
  })

  const commissionAmount = input.grossAmount.mul(rate).toDecimalPlaces(2)
  const sellerNetAmount = input.grossAmount.minus(commissionAmount).toDecimalPlaces(2)

  if (sellerNetAmount.isNegative()) {
    throw new CommissionCalculationError('Seller net amount cannot be negative')
  }

  return {
    ruleId: matchedRule?.id ?? null,
    ruleScope: matchedRule?.scope ?? null,
    rate: rate.toFixed(4),
    commissionAmount: commissionAmount.toFixed(2),
    sellerNetAmount: sellerNetAmount.toFixed(2),
  }
}

function toCreateOrUpdateData(
  input: CreateCommissionRuleInputDto | UpdateCommissionRuleInputDto,
) {
  return {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.scope !== undefined ? { scope: input.scope } : {}),
    ...(input.storeId !== undefined ? { storeId: input.storeId ?? null } : {}),
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId ?? null } : {}),
    ...(input.rate !== undefined ? { rate: new Decimal(input.rate).toDecimalPlaces(4) } : {}),
    ...(input.startsAt !== undefined ? { startsAt: new Date(input.startsAt) } : {}),
    ...(input.endsAt !== undefined
      ? { endsAt: input.endsAt == null ? null : new Date(input.endsAt) }
      : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  }
}

export async function getAdminCommissionRules(
  user: SessionUser,
  query: CommissionRuleQueryDto,
): Promise<CommissionRuleListDto> {
  assertAdmin(user)
  const [items, total] = await Promise.all([
    listCommissionRules(query),
    countCommissionRules(query),
  ])

  return {
    items: items.map((item) => toCommissionRuleDto(item as CommissionRuleRecord)),
    page: query.page,
    limit: query.limit,
    total,
  }
}

export async function getAdminCommissionRuleById(
  user: SessionUser,
  ruleId: string,
): Promise<CommissionRuleDto> {
  assertAdmin(user)
  const rule = await findCommissionRuleById(ruleId)
  if (!rule) {
    throw new CommissionRuleNotFoundError()
  }

  return toCommissionRuleDto(rule)
}

export async function createAdminCommissionRule(
  user: SessionUser,
  input: CreateCommissionRuleInputDto,
): Promise<CommissionRuleDto> {
  assertAdmin(user)
  const startsAt = new Date(input.startsAt)
  const endsAt = input.endsAt == null ? null : new Date(input.endsAt)
  const priority = input.priority ?? 0
  const isActive = input.isActive ?? true

  assertRuleValues({
    rate: input.rate,
    startsAt,
    endsAt,
  })
  await assertScopeReferences(input)
  await assertNoRuleConflict({
    scope: input.scope,
    storeId: input.storeId,
    categoryId: input.categoryId,
    priority,
    startsAt,
    endsAt,
    isActive,
  })

  const rule = await createCommissionRule({
    name: input.name.trim(),
    scope: input.scope,
    storeId: input.storeId ?? null,
    categoryId: input.categoryId ?? null,
    rate: new Decimal(input.rate).toDecimalPlaces(4),
    startsAt,
    endsAt,
    priority,
    isActive,
    createdById: user.id,
  })

  return toCommissionRuleDto(rule as CommissionRuleRecord)
}

export async function updateAdminCommissionRule(
  user: SessionUser,
  ruleId: string,
  input: UpdateCommissionRuleInputDto,
): Promise<CommissionRuleDto> {
  assertAdmin(user)
  const existing = await findCommissionRuleById(ruleId)
  if (!existing) {
    throw new CommissionRuleNotFoundError()
  }

  const nextScope = input.scope ?? existing.scope
  const nextStoreId =
    input.storeId !== undefined ? input.storeId ?? null : existing.storeId ?? null
  const nextCategoryId =
    input.categoryId !== undefined ? input.categoryId ?? null : existing.categoryId ?? null
  const nextStartsAt = input.startsAt ? new Date(input.startsAt) : existing.startsAt
  const nextEndsAt =
    input.endsAt !== undefined
      ? input.endsAt == null
        ? null
        : new Date(input.endsAt)
      : existing.endsAt
  const nextPriority = input.priority ?? existing.priority
  const nextIsActive = input.isActive ?? existing.isActive

  assertRuleValues({
    rate: input.rate ?? existing.rate.toString(),
    startsAt: nextStartsAt,
    endsAt: nextEndsAt,
  })
  await assertScopeReferences({
    scope: nextScope,
    storeId: nextStoreId,
    categoryId: nextCategoryId,
  })
  await assertNoRuleConflict({
    scope: nextScope,
    storeId: nextStoreId,
    categoryId: nextCategoryId,
    priority: nextPriority,
    startsAt: nextStartsAt,
    endsAt: nextEndsAt,
    excludeId: ruleId,
    isActive: nextIsActive,
  })

  const rule = await updateCommissionRule(ruleId, {
    ...toCreateOrUpdateData(input),
    updatedAt: new Date(),
  })

  return toCommissionRuleDto(rule as CommissionRuleRecord)
}

export async function updateAdminCommissionRuleStatus(
  user: SessionUser,
  ruleId: string,
  input: UpdateCommissionRuleStatusInputDto,
): Promise<CommissionRuleDto> {
  assertAdmin(user)
  const existing = await findCommissionRuleById(ruleId)
  if (!existing) {
    throw new CommissionRuleNotFoundError()
  }

  await assertNoRuleConflict({
    scope: existing.scope,
    storeId: existing.storeId,
    categoryId: existing.categoryId,
    priority: existing.priority,
    startsAt: existing.startsAt,
    endsAt: existing.endsAt,
    excludeId: ruleId,
    isActive: input.isActive,
  })

  const rule = await updateCommissionRule(ruleId, {
    isActive: input.isActive,
    updatedAt: new Date(),
  })

  return toCommissionRuleDto(rule as CommissionRuleRecord)
}

export async function archiveAdminCommissionRule(
  user: SessionUser,
  ruleId: string,
): Promise<void> {
  assertAdmin(user)
  const existing = await findCommissionRuleById(ruleId)
  if (!existing) {
    throw new CommissionRuleNotFoundError()
  }

  await updateCommissionRule(ruleId, {
    isActive: false,
    updatedAt: new Date(),
  })
}

export async function previewAdminCommissionRule(
  user: SessionUser,
  input: PreviewCommissionRuleInputDto,
): Promise<CommissionRulePreviewDto> {
  assertAdmin(user)
  const grossAmount = new Decimal(input.grossAmount)
  const resolved = await calculateCommissionForAmount({
    storeId: input.storeId,
    categoryId: input.categoryId,
    grossAmount,
    at: input.at ? new Date(input.at) : undefined,
  })

  let matchedRule: CommissionRuleRecord | null = null
  if (resolved.ruleId) {
    matchedRule = await findCommissionRuleById(resolved.ruleId)
  }

  return {
    matchedRule: toResolvedRuleDto(matchedRule, matchedRule ? undefined : new Decimal(resolved.rate)),
    grossAmount: grossAmount.toFixed(2),
    commissionAmount: resolved.commissionAmount,
    sellerNetAmount: resolved.sellerNetAmount,
  }
}
