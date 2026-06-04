'use client'

import { useSellerMutation } from '@/hooks/useSellerMutation'
import { getSellerShipmentCancelRoute } from '@/lib/constants/apiRoutes'

export default function CancelShipmentButton({
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
      onClick={() => {
        if (!window.confirm('Скасувати це відправлення?')) {
          return
        }

        void execute({
          url: getSellerShipmentCancelRoute(shipmentId),
          successMessage: 'Відправлення скасовано.',
        })
      }}
    >
      {isPending ? 'Скасовуємо...' : 'Скасувати'}
    </button>
  )
}
