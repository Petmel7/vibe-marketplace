'use client'

import { useRouter } from 'next/navigation'
import { useAdminMutation } from '@/hooks/useAdminMutation'
import {
  API_ROUTES,
  getSellerPromotionDetailRoute,
  getSellerPromotionStatusRoute,
} from '@/lib/constants/apiRoutes'
import type { PromotionDetail, PromotionTargetType } from '@/types/promotions'

export type SellerPromotionPayload = {
  code: string
  name: string
  description?: string | null
  type: 'COUPON_CODE' | 'AUTOMATIC_DISCOUNT'
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: string
  minOrderAmount?: string | null
  maxDiscountAmount?: string | null
  usageLimit?: number | null
  usageLimitPerUser?: number | null
  startsAt: string
  endsAt?: string | null
  isActive?: boolean
  storeId: string
  targets: Array<{
    targetType: PromotionTargetType
    targetId: string
  }>
}

export function useSellerPromotions() {
  const router = useRouter()
  const mutation = useAdminMutation()

  return {
    ...mutation,
    createPromotion: (body: SellerPromotionPayload) =>
      mutation.execute<PromotionDetail>({
        url: API_ROUTES.sellerPromotions,
        method: 'POST',
        body,
        successMessage: 'Promotion created.',
        fallbackErrorMessage: 'Unable to create this promotion right now.',
        onSuccess: async (data) => {
          router.push(`/seller/promotions/${data.id}`)
        },
      }),
    updatePromotion: (promotionId: string, body: Partial<SellerPromotionPayload>) =>
      mutation.execute<PromotionDetail>({
        url: getSellerPromotionDetailRoute(promotionId),
        method: 'PATCH',
        body,
        successMessage: 'Promotion updated.',
        fallbackErrorMessage: 'Unable to update this promotion right now.',
      }),
    updatePromotionStatus: (promotionId: string, isActive: boolean) =>
      mutation.execute<PromotionDetail>({
        url: getSellerPromotionStatusRoute(promotionId),
        method: 'PATCH',
        body: { isActive },
        successMessage: isActive ? 'Promotion activated.' : 'Promotion disabled.',
        fallbackErrorMessage: 'Unable to update the promotion status right now.',
      }),
    deletePromotion: (promotionId: string) =>
      mutation.execute<null>({
        url: getSellerPromotionDetailRoute(promotionId),
        method: 'DELETE',
        successMessage: 'Promotion deleted.',
        fallbackErrorMessage: 'Unable to delete this promotion right now.',
        onSuccess: async () => {
          router.push('/seller/promotions')
        },
      }),
  }
}
