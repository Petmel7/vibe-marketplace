'use client'

import { useSellerMutation } from '@/hooks/useSellerMutation'
import { getSellerShipmentCreateTtnRoute } from '@/lib/constants/apiRoutes'

export default function CreateTtnButton({
  shipmentId,
  disabled,
  disabledReason,
}: {
  shipmentId: string
  disabled?: boolean
  disabledReason?: string | null
}) {
  const { execute, isPending } = useSellerMutation()

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="ui-primary-button h-10 px-4 py-2 text-sm"
        disabled={disabled || isPending}
        onClick={() =>
          execute({
            url: getSellerShipmentCreateTtnRoute(shipmentId),
            successMessage: 'ТТН створено успішно.',
          })
        }
        aria-disabled={disabled || isPending}
        title={disabled ? disabledReason ?? undefined : undefined}
      >
        {isPending ? 'Створюємо ТТН...' : 'Створити ТТН'}
      </button>
      {disabledReason ? <p className="text-xs text-copy-muted">{disabledReason}</p> : null}
    </div>
  )
}
