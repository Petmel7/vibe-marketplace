'use client'

import { useAdminMutation } from '@/hooks/useAdminMutation'
import { useSellerMutation } from '@/hooks/useSellerMutation'
import { getAdminShipmentReturnRoute, getSellerShipmentReturnRoute } from '@/lib/constants/apiRoutes'

export default function ReturnShipmentButton({
  shipmentId,
  disabled,
  actor = 'seller',
}: {
  shipmentId: string
  disabled?: boolean
  actor?: 'seller' | 'admin'
}) {
  const sellerMutation = useSellerMutation()
  const adminMutation = useAdminMutation()
  const isPending = actor === 'admin' ? adminMutation.isPending : sellerMutation.isPending

  const handleClick = () => {
    if (!window.confirm('Створити зворотне відправлення для цього shipment?')) {
      return
    }

    if (actor === 'admin') {
      void adminMutation.execute({
        url: getAdminShipmentReturnRoute(shipmentId),
        successMessage: 'Зворотне відправлення створено.',
        fallbackErrorMessage: 'Не вдалося створити зворотне відправлення.',
      })
      return
    }

    void sellerMutation.execute({
      url: getSellerShipmentReturnRoute(shipmentId),
      successMessage: 'Зворотне відправлення створено для магазину.',
      errorMessage: 'Не вдалося створити зворотне відправлення.',
    })
  }

  return (
    <button
      type="button"
      className="ui-secondary-button h-10 px-4 py-2 text-sm"
      disabled={disabled || isPending}
      onClick={handleClick}
    >
      {isPending ? 'Створюємо повернення...' : 'Створити повернення'}
    </button>
  )
}
