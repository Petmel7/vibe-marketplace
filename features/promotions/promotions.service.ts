import Decimal from 'decimal.js'
import {
  PromotionDiscountType,
  PromotionOwnerType,
  PromotionTargetType,
} from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import { requireAdmin, requireSeller } from '@/lib/auth/guards'
import {
  InvalidPromotionCodeError,
  InvalidPromotionTargetError,
  PromotionDeleteConflictError,
  PromotionExpiredError,
  PromotionInactiveError,
  PromotionMinimumAmountError,
  PromotionNotFoundError,
  PromotionOwnershipError,
  PromotionUserLimitReachedError,
  PromotionUsageLimitReachedError,
} from '@/lib/errors/promotion'
import type {
  AppliedPromotionDto,
  CheckoutPromotionPreviewDto,
  CreatePromotionInputDto,
  CreateSellerPromotionInputDto,
  PromotionDto,
  PromotionListDto,
  PromotionQueryDto,
  PromotionSummaryDto,
  PromotionTargetDto,
  PromotionTargetInputDto,
  ResolvedPromotionForCheckoutDto,
  UpdatePromotionInputDto,
  UpdatePromotionStatusInputDto,
  UpdateSellerPromotionInputDto,
} from './promotions.dto'
import {
  countPromotionUsages,
  countPromotionUsagesByUser,
  countPromotions,
  countSellerPromotions,
  createPromotion,
  deletePromotion,
  findOwnedProductsInStoreByIds,
  findOwnedStoreById,
  findPromotionByCode,
  findPromotionById,
  findSellerPromotionById,
  findStoreProductCategoryIds,
  listAutomaticPromotions,
  listPromotions,
  listSellerPromotions,
  replacePromotionTargets,
  updatePromotion,
} from './promotions.repository'

type PromotionRecord = NonNullable<Awaited<ReturnType<typeof findPromotionById>>>

type PromotionEligibleItemInput = {
  storeId: string
  productId: string
  categoryId: string | null
  lineTotal: Decimal
}

function normalizePromotionCode(code: string) {
  return code.trim().toUpperCase()
}

function toNullableString(
  value: { toString(): string } | null | undefined,
): string | null {
  return value ? value.toString() : null
}

function toPromotionTargetDto(target: PromotionRecord['targets'][number]): PromotionTargetDto {
  return {
    id: target.id,
    targetType: target.targetType,
    targetId: target.targetId,
    createdAt: target.createdAt.toISOString(),
  }
}

function toPromotionSummaryDto(promotion: PromotionRecord): PromotionSummaryDto {
  return {
    id: promotion.id,
    code: promotion.code,
    name: promotion.name,
    description: promotion.description ?? null,
    ownerType: promotion.ownerType,
    storeId: promotion.storeId ?? null,
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
    targets: promotion.targets.map(toPromotionTargetDto),
  }
}

function toAppliedPromotionDto(input: ResolvedPromotionForCheckoutDto): AppliedPromotionDto {
  return {
    id: input.id,
    code: input.code,
    name: input.name,
    ownerType: input.ownerType,
    storeId: input.storeId,
    type: input.type,
    discountType: input.discountType,
    discountValue: input.discountValue,
    discountAmount: input.discountAmount,
  }
}

function calculateDiscountAmount(promotion: PromotionRecord, eligibleSubtotal: Decimal): Decimal {
  if (eligibleSubtotal.lte(0)) {
    return new Decimal(0)
  }

  let discount =
    promotion.discountType === PromotionDiscountType.PERCENTAGE
      ? eligibleSubtotal.mul(promotion.discountValue.toString()).div(100)
      : new Decimal(promotion.discountValue.toString())

  if (promotion.maxDiscountAmount) {
    discount = Decimal.min(discount, new Decimal(promotion.maxDiscountAmount.toString()))
  }

  return Decimal.min(discount, eligibleSubtotal).toDecimalPlaces(2)
}

function assertPromotionWindow(promotion: PromotionRecord, now: Date) {
  if (!promotion.isActive) {
    throw new PromotionInactiveError()
  }

  if (promotion.startsAt > now || (promotion.endsAt != null && promotion.endsAt < now)) {
    throw new PromotionExpiredError()
  }
}

function assertMinimumAmount(promotion: PromotionRecord, eligibleSubtotal: Decimal) {
  if (!promotion.minOrderAmount) {
    return
  }

  const minimum = new Decimal(promotion.minOrderAmount.toString())
  if (eligibleSubtotal.lessThan(minimum)) {
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

function resolveEligibleItemsForPromotion(
  promotion: PromotionRecord,
  items: PromotionEligibleItemInput[],
): PromotionEligibleItemInput[] {
  if (promotion.ownerType === PromotionOwnerType.MARKETPLACE) {
    return items
  }

  const targetIds = new Set(promotion.targets.map((target) => target.targetId))
  const targetType = promotion.targets[0]?.targetType

  if (!promotion.storeId || !targetType || targetIds.size === 0) {
    return []
  }

  switch (targetType) {
    case PromotionTargetType.STORE:
      return items.filter((item) => item.storeId === promotion.storeId)
    case PromotionTargetType.PRODUCT:
      return items.filter(
        (item) => item.storeId === promotion.storeId && targetIds.has(item.productId),
      )
    case PromotionTargetType.CATEGORY:
      return items.filter(
        (item) =>
          item.storeId === promotion.storeId &&
          item.categoryId != null &&
          targetIds.has(item.categoryId),
      )
    default:
      return []
  }
}

function sumEligibleSubtotal(items: PromotionEligibleItemInput[]): Decimal {
  return items.reduce((sum, item) => sum.plus(item.lineTotal), new Decimal(0))
}

async function validatePromotionForCheckout(input: {
  promotion: PromotionRecord
  userId: string
  items: PromotionEligibleItemInput[]
  now: Date
}): Promise<ResolvedPromotionForCheckoutDto> {
  assertPromotionWindow(input.promotion, input.now)

  const eligibleItems = resolveEligibleItemsForPromotion(input.promotion, input.items)
  const eligibleSubtotal = sumEligibleSubtotal(eligibleItems)

  if (eligibleSubtotal.lte(0)) {
    throw new InvalidPromotionCodeError('This promotion does not apply to items in your cart')
  }

  assertMinimumAmount(input.promotion, eligibleSubtotal)
  await assertUsageLimits(input.promotion, input.userId)

  const discountAmount = calculateDiscountAmount(input.promotion, eligibleSubtotal)

  return {
    id: input.promotion.id,
    code: input.promotion.code,
    name: input.promotion.name,
    ownerType: input.promotion.ownerType,
    storeId: input.promotion.storeId ?? null,
    type: input.promotion.type,
    discountType: input.promotion.discountType,
    discountValue: input.promotion.discountValue.toString(),
    discountAmount: discountAmount.toFixed(2),
    eligibleSubtotal: eligibleSubtotal.toFixed(2),
  }
}

function toPromotionMutationData(
  createdById: string | undefined,
  input: CreatePromotionInputDto | UpdatePromotionInputDto | UpdateSellerPromotionInputDto,
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

async function assertSellerPromotionTargetsOwned(input: {
  ownerId: string
  storeId: string
  targets: PromotionTargetInputDto[]
}) {
  const store = await findOwnedStoreById(input.ownerId, input.storeId)
  if (!store) {
    throw new PromotionOwnershipError('You do not own the selected store')
  }

  const targetTypes = new Set(input.targets.map((target) => target.targetType))
  if (targetTypes.size !== 1) {
    throw new InvalidPromotionTargetError(
      'Seller promotions must target a single scope type per promotion',
    )
  }

  const targetType = input.targets[0]?.targetType
  if (!targetType) {
    throw new InvalidPromotionTargetError('At least one promotion target is required')
  }

  if (targetType === PromotionTargetType.STORE) {
    if (input.targets.length !== 1 || input.targets[0]?.targetId !== input.storeId) {
      throw new InvalidPromotionTargetError('Store promotions must target the selected store only')
    }

    return
  }

  if (targetType === PromotionTargetType.PRODUCT) {
    const productIds = input.targets.map((target) => target.targetId)
    const products = await findOwnedProductsInStoreByIds(input.storeId, productIds)
    if (products.length !== productIds.length) {
      throw new InvalidPromotionTargetError('One or more product targets do not belong to the selected store')
    }

    return
  }

  if (targetType === PromotionTargetType.CATEGORY) {
    const categoryIds = input.targets.map((target) => target.targetId)
    const ownedCategoryIds = await findStoreProductCategoryIds(input.storeId, categoryIds)
    if (ownedCategoryIds.length !== new Set(categoryIds).size) {
      throw new InvalidPromotionTargetError(
        'Category targets must match categories used by products in the selected store',
      )
    }
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
    ownerType: PromotionOwnerType.MARKETPLACE,
    storeId: null,
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

export async function getSellerPromotions(
  user: SessionUser,
  query: PromotionQueryDto,
): Promise<PromotionListDto> {
  requireSeller(user)
  const [items, total] = await Promise.all([
    listSellerPromotions(user.id, query),
    countSellerPromotions(user.id, query),
  ])

  return {
    items: items.map((item) => toPromotionSummaryDto(item as PromotionRecord)),
    page: query.page,
    limit: query.limit,
    total,
  }
}

export async function getSellerPromotionById(
  user: SessionUser,
  promotionId: string,
): Promise<PromotionDto> {
  requireSeller(user)
  const promotion = await findSellerPromotionById(user.id, promotionId)
  if (!promotion) {
    throw new PromotionNotFoundError()
  }

  return toPromotionDto(promotion as PromotionRecord)
}

export async function createSellerPromotion(
  user: SessionUser,
  input: CreateSellerPromotionInputDto,
): Promise<PromotionDto> {
  requireSeller(user)
  await assertSellerPromotionTargetsOwned({
    ownerId: user.id,
    storeId: input.storeId,
    targets: input.targets,
  })

  const promotion = await createPromotion({
    ownerType: PromotionOwnerType.SELLER,
    storeId: input.storeId,
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
    targets: input.targets,
  })

  return toPromotionDto(promotion as PromotionRecord)
}

export async function updateSellerPromotion(
  user: SessionUser,
  promotionId: string,
  input: UpdateSellerPromotionInputDto,
): Promise<PromotionDto> {
  requireSeller(user)
  const existing = await findSellerPromotionById(user.id, promotionId)
  if (!existing) {
    throw new PromotionNotFoundError()
  }

  const targetStoreId = input.storeId ?? existing.storeId
  if (!targetStoreId) {
    throw new InvalidPromotionTargetError('Seller promotions must belong to a store')
  }

  if (input.storeId && input.storeId !== existing.storeId) {
    throw new InvalidPromotionTargetError('Seller promotions cannot be moved to another store')
  }

  if (input.targets) {
    await assertSellerPromotionTargetsOwned({
      ownerId: user.id,
      storeId: targetStoreId,
      targets: input.targets,
    })
  }

  const updated = await updatePromotion(promotionId, {
    ...toPromotionMutationData(undefined, input),
    updatedAt: new Date(),
  })

  const promotion = input.targets
    ? await replacePromotionTargets(promotionId, input.targets)
    : updated

  return toPromotionDto((promotion ?? updated) as PromotionRecord)
}

export async function updateSellerPromotionStatus(
  user: SessionUser,
  promotionId: string,
  input: UpdatePromotionStatusInputDto,
): Promise<PromotionDto> {
  requireSeller(user)
  const existing = await findSellerPromotionById(user.id, promotionId)
  if (!existing) {
    throw new PromotionNotFoundError()
  }

  const promotion = await updatePromotion(promotionId, {
    isActive: input.isActive,
    updatedAt: new Date(),
  })

  return toPromotionDto(promotion as PromotionRecord)
}

export async function deleteSellerPromotion(user: SessionUser, promotionId: string): Promise<void> {
  requireSeller(user)
  const promotion = await findSellerPromotionById(user.id, promotionId)
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
  items: PromotionEligibleItemInput[]
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
      items: input.items,
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
        items: input.items,
        now,
      })
      const discountAmount = new Decimal(resolved.discountAmount)
      if (discountAmount.greaterThan(bestDiscount)) {
        bestPromotion = resolved
        bestDiscount = discountAmount
      }
    } catch (error) {
      if (
        error instanceof PromotionInactiveError ||
        error instanceof PromotionExpiredError ||
        error instanceof PromotionMinimumAmountError ||
        error instanceof PromotionUsageLimitReachedError ||
        error instanceof PromotionUserLimitReachedError ||
        error instanceof InvalidPromotionCodeError
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
