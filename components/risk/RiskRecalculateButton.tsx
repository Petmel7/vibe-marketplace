'use client'

import { useRiskRecalculation } from '@/hooks/useRiskRecalculation'
import type { RiskEntityType } from '@/types/risk'

export default function RiskRecalculateButton({
  targetType,
  targetId,
  label,
}: {
  targetType: 'ALL' | RiskEntityType
  targetId?: string
  label?: string
}) {
  const { recalculate, isPending, errorMessage } = useRiskRecalculation()

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="ui-secondary-button disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={() => {
          void recalculate(targetType, targetId)
        }}
      >
        {isPending ? 'Оновлюємо…' : (label ?? 'Перерахувати ризик')}
      </button>
      {errorMessage ? <p className="text-sm text-brand-danger">{errorMessage}</p> : null}
    </div>
  )
}
