'use client'

import { useAdminPayouts } from '@/hooks/useAdminPayouts'

export default function RecalculateSellerBalancesButton({
  sellerId,
  storeId,
  label = 'Перерахувати баланси',
}: {
  sellerId?: string
  storeId?: string
  label?: string
}) {
  const { recalculateBalances, isPending } = useAdminPayouts()

  return (
    <button
      type="button"
      className="ui-secondary-button"
      disabled={isPending}
      onClick={async () => {
        await recalculateBalances({
          sellerId,
          storeId,
          releaseEligible: true,
        })
      }}
    >
      {isPending ? 'Перераховуємо...' : label}
    </button>
  )
}
