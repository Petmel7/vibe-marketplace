'use client'

import { useAdminMutation } from '@/hooks/useAdminMutation'
import {
  API_ROUTES,
  getAdminPayoutDetailRoute,
  getAdminPayoutStatusRoute,
} from '@/lib/constants/apiRoutes'
import type {
  AdminPayoutDetail,
  PayoutStatus,
  RecalculateSellerBalancesResult,
} from '@/types/payouts'

export function useAdminPayouts() {
  const mutation = useAdminMutation()

  return {
    ...mutation,
    createPayout: (body: {
      storeId: string
      amount: string
      method: 'MANUAL' | 'BANK_TRANSFER'
      reference?: string
      adminNote?: string
    }) =>
      mutation.execute<AdminPayoutDetail>({
        url: API_ROUTES.adminPayouts,
        method: 'POST',
        body,
        successMessage: 'Виплату створено.',
        fallbackErrorMessage: 'Не вдалося створити виплату. Спробуйте ще раз.',
      }),
    updatePayoutStatus: (
      payoutId: string,
      body: { status: PayoutStatus; reference?: string; adminNote?: string },
    ) =>
      mutation.execute<AdminPayoutDetail>({
        url: getAdminPayoutStatusRoute(payoutId),
        method: 'PATCH',
        body,
        successMessage: 'Статус виплати оновлено.',
        fallbackErrorMessage: 'Не вдалося оновити статус виплати. Спробуйте ще раз.',
      }),
    recalculateBalances: (body: { sellerId?: string; storeId?: string; releaseEligible?: boolean }) =>
      mutation.execute<RecalculateSellerBalancesResult>({
        url: API_ROUTES.adminSellerBalancesRecalculate,
        method: 'POST',
        body,
        successMessage: 'Баланс продавців перераховано.',
        fallbackErrorMessage: 'Не вдалося перерахувати баланси. Спробуйте ще раз.',
      }),
    fetchPayoutDetail: async (payoutId: string) => {
      const response = await fetch(getAdminPayoutDetailRoute(payoutId), { cache: 'no-store' })
      const json = (await response.json()) as
        | { success: true; data: AdminPayoutDetail }
        | { success: false; error?: { message?: string } }

      return response.ok && json.success ? json.data : null
    },
  }
}
