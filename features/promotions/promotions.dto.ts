import type {
  PromotionDiscountType,
  PromotionOwnerType,
  PromotionTargetType,
  PromotionType,
} from '@/app/generated/prisma/client'

export type PromotionQueryDto = {
  page: number
  limit: number
  type?: PromotionType
  isActive?: boolean
  code?: string
  storeId?: string
}

export type CreatePromotionInputDto = {
  code: string
  name: string
  description?: string | null
  type: PromotionType
  discountType: PromotionDiscountType
  discountValue: string
  minOrderAmount?: string | null
  maxDiscountAmount?: string | null
  usageLimit?: number | null
  usageLimitPerUser?: number | null
  startsAt: string
  endsAt?: string | null
  isActive?: boolean
}

export type UpdatePromotionInputDto = Partial<CreatePromotionInputDto>

export type PromotionTargetInputDto = {
  targetType: PromotionTargetType
  targetId: string
}

export type CreateSellerPromotionInputDto = CreatePromotionInputDto & {
  storeId: string
  targets: PromotionTargetInputDto[]
}

export type UpdateSellerPromotionInputDto = Partial<CreatePromotionInputDto> & {
  storeId?: string
  targets?: PromotionTargetInputDto[]
}

export type UpdatePromotionStatusInputDto = {
  isActive: boolean
}

export type ApplyCheckoutPromotionInputDto = {
  cartId?: string
  couponCode: string
}

export type PromotionSummaryDto = {
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

export type PromotionTargetDto = {
  id: string
  targetType: PromotionTargetType
  targetId: string
  createdAt: string
}

export type PromotionDto = PromotionSummaryDto & {
  orderPromotionCount: number
  targets: PromotionTargetDto[]
}

export type PromotionListDto = {
  items: PromotionSummaryDto[]
  page: number
  limit: number
  total: number
}

export type AppliedPromotionDto = {
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

export type CheckoutPromotionPreviewDto = {
  cartId: string | null
  subtotal: string
  discountAmount: string
  total: string
  appliedPromotion: AppliedPromotionDto | null
}

export type ResolvedPromotionForCheckoutDto = {
  id: string
  code: string
  name: string
  ownerType: PromotionOwnerType
  storeId: string | null
  type: PromotionType
  discountType: PromotionDiscountType
  discountValue: string
  discountAmount: string
  eligibleSubtotal: string
}
