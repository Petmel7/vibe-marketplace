'use client'

import { useSellerMutation } from '@/hooks/useSellerMutation'
import { getSellerShipmentRefreshStatusRoute } from '@/lib/constants/apiRoutes'

export default function RefreshShipmentStatusButton({
  shipmentId,
  disabled,
}: {
  shipmentId: string
  disabled?: boolean
}) {
  const { execute, isPending } = useSellerMutation()

  return (
    <button
      type="button"
      className="ui-secondary-button h-10 px-4 py-2 text-sm"
      disabled={disabled || isPending}
      onClick={() =>
        execute({
          url: getSellerShipmentRefreshStatusRoute(shipmentId),
          successMessage: 'Статус відправлення оновлено.',
        })
      }
    >
      {isPending ? 'Оновлюємо...' : 'Оновити статус'}
    </button>
  )
}
