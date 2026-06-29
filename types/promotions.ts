export const PROMOTION_TYPES = ['COUPON_CODE', 'AUTOMATIC_DISCOUNT'] as const
export const PROMOTION_DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'] as const
export const PROMOTION_DISPLAY_STATUSES = ['ACTIVE', 'SCHEDULED', 'EXPIRED', 'DISABLED'] as const
export const PROMOTION_OWNER_TYPES = ['MARKETPLACE', 'SELLER'] as const
export const PROMOTION_TARGET_TYPES = ['STORE', 'PRODUCT', 'CATEGORY'] as const

export type PromotionType = (typeof PROMOTION_TYPES)[number]
export type PromotionDiscountType = (typeof PROMOTION_DISCOUNT_TYPES)[number]
export type PromotionDisplayStatus = (typeof PROMOTION_DISPLAY_STATUSES)[number]
export type PromotionOwnerType = (typeof PROMOTION_OWNER_TYPES)[number]
export type PromotionTargetType = (typeof PROMOTION_TARGET_TYPES)[number]

export type PromotionTarget = {
  id: string
  targetType: PromotionTargetType
  targetId: string
  createdAt: string
}

export type AppliedPromotion = {
  id: string
  code: string
  name: string
  ownerType: PromotionOwnerType
  storeId: string | null
  type: PromotionType
  discountType: PromotionDiscountType
  discountValue: string
  discountAmount: string
}

export type VisibleProductPromotion = {
  id: string
  name: string
  code: string | null
  ownerType: PromotionOwnerType
  storeId: string | null
  type: PromotionType
  discountType: PromotionDiscountType
  discountValue: string
  endsAt: string | null
  targetType: PromotionTargetType | null
  targetId: string | null
}

export type CheckoutPromotionPreview = {
  cartId: string | null
  subtotal: string
  discountAmount: string
  total: string
  appliedPromotion: AppliedPromotion | null
}

export type PromotionSummary = {
  id: string
  code: string
  name: string
  description: string | null
  ownerType: PromotionOwnerType
  storeId: string | null
  type: PromotionType
  discountType: PromotionDiscountType
  discountValue: string
  minOrderAmount: string | null
  maxDiscountAmount: string | null
  usageLimit: number | null
  usageLimitPerUser: number | null
  startsAt: string
  endsAt: string | null
  isActive: boolean
  createdById: string
  createdAt: string
  updatedAt: string
  totalUsageCount: number
}

export type PromotionDetail = PromotionSummary & {
  orderPromotionCount: number
  targets: PromotionTarget[]
}

export type PromotionListResponse = {
  items: PromotionSummary[]
  page: number
  limit: number
  total: number
}

export type SellerPromotionProductOption = {
  id: string
  name: string
  price: string
  status: string
}

export type SellerPromotionCategoryOption = {
  id: string
  name: string
  parentId: string | null
  level: number
}

export type SellerPromotionStoreContext = {
  id: string
  name: string
  slug: string
}

export function getPromotionTypeLabel(type: PromotionType) {
  switch (type) {
    case 'COUPON_CODE':
      return 'Coupon code'
    case 'AUTOMATIC_DISCOUNT':
      return 'Automatic discount'
  }
}

export function getPromotionDiscountTypeLabel(type: PromotionDiscountType) {
  switch (type) {
    case 'PERCENTAGE':
      return 'Percentage'
    case 'FIXED_AMOUNT':
      return 'Fixed amount'
  }
}

export function getPromotionDisplayStatus(promotion: Pick<PromotionSummary, 'isActive' | 'startsAt' | 'endsAt'>, now = new Date()): PromotionDisplayStatus {
  if (!promotion.isActive) {
    return 'DISABLED'
  }

  const startsAt = new Date(promotion.startsAt)
  if (startsAt > now) {
    return 'SCHEDULED'
  }

  if (promotion.endsAt) {
    const endsAt = new Date(promotion.endsAt)
    if (endsAt < now) {
      return 'EXPIRED'
    }
  }

  return 'ACTIVE'
}

export function getPromotionDisplayStatusLabel(status: PromotionDisplayStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'Active'
    case 'SCHEDULED':
      return 'Scheduled'
    case 'EXPIRED':
      return 'Expired'
    case 'DISABLED':
      return 'Disabled'
  }
}

export function getPromotionOwnerLabel(ownerType: PromotionOwnerType) {
  switch (ownerType) {
    case 'MARKETPLACE':
      return 'Marketplace coupon'
    case 'SELLER':
      return 'Store coupon'
  }
}

export function getPromotionTargetTypeLabel(targetType: PromotionTargetType) {
  switch (targetType) {
    case 'STORE':
      return 'Whole store'
    case 'PRODUCT':
      return 'Selected products'
    case 'CATEGORY':
      return 'Selected categories'
  }
}

export function getPromotionRemainingUses(promotion: Pick<PromotionSummary, 'usageLimit' | 'totalUsageCount'>) {
  if (promotion.usageLimit == null) {
    return null
  }

  return Math.max(promotion.usageLimit - promotion.totalUsageCount, 0)
}
