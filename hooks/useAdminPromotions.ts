'use client'

import { useRouter } from 'next/navigation'
import { useAdminMutation } from '@/hooks/useAdminMutation'
import {
  API_ROUTES,
  getAdminPromotionDetailRoute,
  getAdminPromotionStatusRoute,
} from '@/lib/constants/apiRoutes'
import type { PromotionDetail } from '@/types/promotions'

type PromotionPayload = {
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
}

export function useAdminPromotions() {
  const router = useRouter()
  const mutation = useAdminMutation()

  return {
    ...mutation,
    createPromotion: (body: PromotionPayload) =>
      mutation.execute<PromotionDetail>({
        url: API_ROUTES.adminPromotions,
        method: 'POST',
        body,
        successMessage: 'Promotion created.',
        fallbackErrorMessage: 'Unable to create this promotion right now.',
        onSuccess: async (data) => {
          router.push(`/admin/promotions/${data.id}`)
        },
      }),
    updatePromotion: (promotionId: string, body: Partial<PromotionPayload>) =>
      mutation.execute<PromotionDetail>({
        url: getAdminPromotionDetailRoute(promotionId),
        method: 'PATCH',
        body,
        successMessage: 'Promotion updated.',
        fallbackErrorMessage: 'Unable to update this promotion right now.',
      }),
    updatePromotionStatus: (promotionId: string, isActive: boolean) =>
      mutation.execute<PromotionDetail>({
        url: getAdminPromotionStatusRoute(promotionId),
        method: 'PATCH',
        body: { isActive },
        successMessage: isActive ? 'Promotion activated.' : 'Promotion disabled.',
        fallbackErrorMessage: 'Unable to update the promotion status right now.',
      }),
    deletePromotion: (promotionId: string) =>
      mutation.execute<null>({
        url: getAdminPromotionDetailRoute(promotionId),
        method: 'DELETE',
        successMessage: 'Promotion deleted.',
        fallbackErrorMessage: 'Unable to delete this promotion right now.',
        onSuccess: async () => {
          router.push('/admin/promotions')
        },
      }),
    fetchPromotionDetail: async (promotionId: string) => {
      const response = await fetch(getAdminPromotionDetailRoute(promotionId), { cache: 'no-store' })
      const json = (await response.json()) as
        | { success: true; data: PromotionDetail }
        | { success: false; error?: { message?: string } }

      return response.ok && json.success ? json.data : null
    },
  }
}
