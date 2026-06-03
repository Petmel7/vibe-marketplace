import Decimal from 'decimal.js'
import {
  PromotionDiscountType,
} from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import { requireAdmin } from '@/lib/auth/guards'
import {
  InvalidPromotionCodeError,
  PromotionDeleteConflictError,
  PromotionExpiredError,
  PromotionInactiveError,
  PromotionMinimumAmountError,
  PromotionNotFoundError,
  PromotionUserLimitReachedError,
  PromotionUsageLimitReachedError,
} from '@/lib/errors/promotion'
import type {
  AppliedPromotionDto,
  CheckoutPromotionPreviewDto,
  CreatePromotionInputDto,
  PromotionDto,
  PromotionListDto,
  PromotionQueryDto,
  PromotionSummaryDto,
  ResolvedPromotionForCheckoutDto,
  UpdatePromotionInputDto,
  UpdatePromotionStatusInputDto,
} from './promotions.dto'
import {
  countPromotionUsages,
  countPromotionUsagesByUser,
  countPromotions,
  createPromotion,
  deletePromotion,
  findPromotionByCode,
  findPromotionById,
  listAutomaticPromotions,
  listPromotions,
  updatePromotion,
} from './promotions.repository'

type PromotionRecord = NonNullable<Awaited<ReturnType<typeof findPromotionById>>>

function normalizePromotionCode(code: string) {
  return code.trim().toUpperCase()
}

function toNullableString(
  value: { toString(): string } | null | undefined,
): string | null {
  return value ? value.toString() : null
}

function toPromotionSummaryDto(promotion: PromotionRecord): PromotionSummaryDto {
  return {
    id: promotion.id,
    code: promotion.code,
    name: promotion.name,
    description: promotion.description ?? null,
    type: promotion.type,
    discountType: promotion.discountType,
    discountValue: promotion.discountValue.toString(),
    minOrderAmount: toNullableString(promotion.minOrderAmount),
    maxDiscountAmount: toNullableString(promotion.maxDiscountAmount),
    usageLimit: promotion.usageLimit ?? null,
    usageLimitPerUser: promotion.usageLimitPerUser ?? null,
    startsAt: promotion.startsAt.toISOString(),
    endsAt: promotion.endsAt?.toISOString() ?? null,
    isActive: promotion.isActive,
    createdById: promotion.createdById,
    createdAt: promotion.createdAt.toISOString(),
    updatedAt: promotion.updatedAt.toISOString(),
    totalUsageCount: promotion._count.usages,
  }
}

function toPromotionDto(promotion: PromotionRecord): PromotionDto {
  return {
    ...toPromotionSummaryDto(promotion),
    orderPromotionCount: promotion._count.orderPromotions,
  }
}

function toAppliedPromotionDto(input: ResolvedPromotionForCheckoutDto): AppliedPromotionDto {
  return {
    id: input.id,
    code: input.code,
    name: input.name,
    type: input.type,
    discountType: input.discountType,
    discountValue: input.discountValue,
    discountAmount: input.discountAmount,
  }
}

function calculateDiscountAmount(promotion: PromotionRecord, subtotal: Decimal): Decimal {
  if (subtotal.lte(0)) {
    return new Decimal(0)
  }

  let discount =
    promotion.discountType === PromotionDiscountType.PERCENTAGE
      ? subtotal.mul(promotion.discountValue.toString()).div(100)
      : new Decimal(promotion.discountValue.toString())

  if (promotion.maxDiscountAmount) {
    discount = Decimal.min(discount, new Decimal(promotion.maxDiscountAmount.toString()))
  }

  return Decimal.min(discount, subtotal).toDecimalPlaces(2)
}

function assertPromotionWindow(promotion: PromotionRecord, now: Date) {
  if (!promotion.isActive) {
    throw new PromotionInactiveError()
  }

  if (promotion.startsAt > now || (promotion.endsAt != null && promotion.endsAt < now)) {
    throw new PromotionExpiredError()
  }
}

function assertMinimumAmount(promotion: PromotionRecord, subtotal: Decimal) {
  if (!promotion.minOrderAmount) {
    return
  }

  const minimum = new Decimal(promotion.minOrderAmount.toString())
  if (subtotal.lessThan(minimum)) {
    throw new PromotionMinimumAmountError(
      `Order subtotal must be at least ${minimum.toFixed(2)} to use this promotion`,
    )
  }
}

async function assertUsageLimits(
  promotion: PromotionRecord,
  userId: string,
) {
  const [totalUsageCount, userUsageCount] = await Promise.all([
    promotion.usageLimit != null ? countPromotionUsages(promotion.id) : Promise.resolve(0),
    promotion.usageLimitPerUser != null
      ? countPromotionUsagesByUser(promotion.id, userId)
      : Promise.resolve(0),
  ])

  if (promotion.usageLimit != null && totalUsageCount >= promotion.usageLimit) {
    throw new PromotionUsageLimitReachedError()
  }

  if (promotion.usageLimitPerUser != null && userUsageCount >= promotion.usageLimitPerUser) {
    throw new PromotionUserLimitReachedError()
  }
}

async function validatePromotionForCheckout(input: {
  promotion: PromotionRecord
  userId: string
  subtotal: Decimal
  now: Date
}): Promise<ResolvedPromotionForCheckoutDto> {
  assertPromotionWindow(input.promotion, input.now)
  assertMinimumAmount(input.promotion, input.subtotal)
  await assertUsageLimits(input.promotion, input.userId)

  const discountAmount = calculateDiscountAmount(input.promotion, input.subtotal)

  return {
    id: input.promotion.id,
    code: input.promotion.code,
    name: input.promotion.name,
    type: input.promotion.type,
    discountType: input.promotion.discountType,
    discountValue: input.promotion.discountValue.toString(),
    discountAmount: discountAmount.toFixed(2),
  }
}

function toPromotionMutationData(
  createdById: string | undefined,
  input: CreatePromotionInputDto | UpdatePromotionInputDto,
) {
  const normalizedCode = input.code ? normalizePromotionCode(input.code) : undefined

  return {
    ...(normalizedCode !== undefined ? { code: normalizedCode } : {}),
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.discountType !== undefined ? { discountType: input.discountType } : {}),
    ...(input.discountValue !== undefined
      ? { discountValue: new Decimal(input.discountValue).toDecimalPlaces(2) }
      : {}),
    ...(input.minOrderAmount !== undefined
      ? {
          minOrderAmount:
            input.minOrderAmount == null ? null : new Decimal(input.minOrderAmount).toDecimalPlaces(2),
        }
      : {}),
    ...(input.maxDiscountAmount !== undefined
      ? {
          maxDiscountAmount:
            input.maxDiscountAmount == null
              ? null
              : new Decimal(input.maxDiscountAmount).toDecimalPlaces(2),
        }
      : {}),
    ...(input.usageLimit !== undefined ? { usageLimit: input.usageLimit ?? null } : {}),
    ...(input.usageLimitPerUser !== undefined
      ? { usageLimitPerUser: input.usageLimitPerUser ?? null }
      : {}),
    ...(input.startsAt !== undefined ? { startsAt: new Date(input.startsAt) } : {}),
    ...(input.endsAt !== undefined
      ? { endsAt: input.endsAt == null ? null : new Date(input.endsAt) }
      : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(createdById ? { createdById } : {}),
  }
}

export async function getAdminPromotions(
  user: SessionUser,
  query: PromotionQueryDto,
): Promise<PromotionListDto> {
  requireAdmin(user)
  const [items, total] = await Promise.all([listPromotions(query), countPromotions(query)])

  return {
    items: items.map((item) => toPromotionSummaryDto(item as PromotionRecord)),
    page: query.page,
    limit: query.limit,
    total,
  }
}

export async function getAdminPromotionById(
  user: SessionUser,
  promotionId: string,
): Promise<PromotionDto> {
  requireAdmin(user)
  const promotion = await findPromotionById(promotionId)
  if (!promotion) {
    throw new PromotionNotFoundError()
  }

  return toPromotionDto(promotion)
}

export async function createAdminPromotion(
  user: SessionUser,
  input: CreatePromotionInputDto,
): Promise<PromotionDto> {
  requireAdmin(user)
  const promotion = await createPromotion({
    code: normalizePromotionCode(input.code),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    type: input.type,
    discountType: input.discountType,
    discountValue: new Decimal(input.discountValue).toDecimalPlaces(2),
    minOrderAmount:
      input.minOrderAmount == null ? null : new Decimal(input.minOrderAmount).toDecimalPlaces(2),
    maxDiscountAmount:
      input.maxDiscountAmount == null ? null : new Decimal(input.maxDiscountAmount).toDecimalPlaces(2),
    usageLimit: input.usageLimit ?? null,
    usageLimitPerUser: input.usageLimitPerUser ?? null,
    startsAt: new Date(input.startsAt),
    endsAt: input.endsAt == null ? null : new Date(input.endsAt),
    isActive: input.isActive ?? true,
    createdById: user.id,
    updatedAt: new Date(),
  })

  return toPromotionDto(promotion as PromotionRecord)
}

export async function updateAdminPromotion(
  user: SessionUser,
  promotionId: string,
  input: UpdatePromotionInputDto,
): Promise<PromotionDto> {
  requireAdmin(user)
  const existing = await findPromotionById(promotionId)
  if (!existing) {
    throw new PromotionNotFoundError()
  }

  const promotion = await updatePromotion(promotionId, {
    ...toPromotionMutationData(undefined, input),
    updatedAt: new Date(),
  })

  return toPromotionDto(promotion as PromotionRecord)
}

export async function updateAdminPromotionStatus(
  user: SessionUser,
  promotionId: string,
  input: UpdatePromotionStatusInputDto,
): Promise<PromotionDto> {
  requireAdmin(user)
  const existing = await findPromotionById(promotionId)
  if (!existing) {
    throw new PromotionNotFoundError()
  }

  const promotion = await updatePromotion(promotionId, {
    isActive: input.isActive,
    updatedAt: new Date(),
  })

  return toPromotionDto(promotion as PromotionRecord)
}

export async function deleteAdminPromotion(user: SessionUser, promotionId: string): Promise<void> {
  requireAdmin(user)
  const promotion = await findPromotionById(promotionId)
  if (!promotion) {
    throw new PromotionNotFoundError()
  }

  if (promotion._count.usages > 0 || promotion._count.orderPromotions > 0) {
    throw new PromotionDeleteConflictError()
  }

  await deletePromotion(promotionId)
}

export async function resolvePromotionForCheckout(input: {
  userId: string
  subtotal: Decimal
  couponCode?: string | null
  now?: Date
}): Promise<ResolvedPromotionForCheckoutDto | null> {
  const now = input.now ?? new Date()

  if (input.couponCode) {
    const promotion = await findPromotionByCode(normalizePromotionCode(input.couponCode))
    if (!promotion) {
      throw new InvalidPromotionCodeError()
    }

    return validatePromotionForCheckout({
      promotion: promotion as PromotionRecord,
      userId: input.userId,
      subtotal: input.subtotal,
      now,
    })
  }

  const promotions = await listAutomaticPromotions(now)
  let bestPromotion: ResolvedPromotionForCheckoutDto | null = null
  let bestDiscount = new Decimal(0)

  for (const promotion of promotions) {
    try {
      const resolved = await validatePromotionForCheckout({
        promotion: promotion as PromotionRecord,
        userId: input.userId,
        subtotal: input.subtotal,
        now,
      })
      const discountAmount = new Decimal(resolved.discountAmount)
      if (discountAmount.greaterThan(bestDiscount)) {
        bestPromotion = resolved
        bestDiscount = discountAmount
      }
    } catch (
      error
    ) {
      if (
        error instanceof PromotionInactiveError ||
        error instanceof PromotionExpiredError ||
        error instanceof PromotionMinimumAmountError ||
        error instanceof PromotionUsageLimitReachedError ||
        error instanceof PromotionUserLimitReachedError
      ) {
        continue
      }

      throw error
    }
  }

  return bestPromotion
}

export function buildCheckoutPromotionPreview(input: {
  cartId: string | null
  subtotal: Decimal
  appliedPromotion: ResolvedPromotionForCheckoutDto | null
}): CheckoutPromotionPreviewDto {
  const discountAmount = input.appliedPromotion
    ? new Decimal(input.appliedPromotion.discountAmount)
    : new Decimal(0)
  const total = Decimal.max(input.subtotal.minus(discountAmount), new Decimal(0))

  return {
    cartId: input.cartId,
    subtotal: input.subtotal.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    total: total.toFixed(2),
    appliedPromotion: input.appliedPromotion ? toAppliedPromotionDto(input.appliedPromotion) : null,
  }
}

export function normalizeCouponCode(input: string | null | undefined): string | null {
  if (!input) {
    return null
  }

  return normalizePromotionCode(input)
}
