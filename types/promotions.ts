export const PROMOTION_TYPES = ['COUPON_CODE', 'AUTOMATIC_DISCOUNT'] as const
export const PROMOTION_DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'] as const
export const PROMOTION_DISPLAY_STATUSES = ['ACTIVE', 'SCHEDULED', 'EXPIRED', 'DISABLED'] as const

export type PromotionType = (typeof PROMOTION_TYPES)[number]
export type PromotionDiscountType = (typeof PROMOTION_DISCOUNT_TYPES)[number]
export type PromotionDisplayStatus = (typeof PROMOTION_DISPLAY_STATUSES)[number]

export type AppliedPromotion = {
  id: string
  code: string
  name: string
  type: PromotionType
  discountType: PromotionDiscountType
  discountValue: string
  discountAmount: string
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
}

export type PromotionListResponse = {
  items: PromotionSummary[]
  page: number
  limit: number
  total: number
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

export function getPromotionRemainingUses(promotion: Pick<PromotionSummary, 'usageLimit' | 'totalUsageCount'>) {
  if (promotion.usageLimit == null) {
    return null
  }

  return Math.max(promotion.usageLimit - promotion.totalUsageCount, 0)
}
