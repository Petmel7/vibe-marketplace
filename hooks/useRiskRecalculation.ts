'use client'

import { useAdminMutation } from '@/hooks/useAdminMutation'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import type { RiskEntityType, RiskRecalculationResult } from '@/types/risk'

export function useRiskRecalculation() {
  const mutation = useAdminMutation()

  async function recalculate(targetType: 'ALL' | RiskEntityType, targetId?: string) {
    return mutation.execute<RiskRecalculationResult>({
      url: API_ROUTES.adminRiskRecalculate,
      method: 'POST',
      body: targetType === 'ALL' ? { targetType } : { targetType, targetId },
      successMessage:
        targetType === 'ALL'
          ? 'Ризик-профілі успішно перераховано.'
          : 'Ризик-профіль успішно оновлено.',
      fallbackErrorMessage: 'Не вдалося перерахувати ризик-профіль. Спробуйте ще раз.',
    })
  }

  return {
    ...mutation,
    recalculate,
  }
}
