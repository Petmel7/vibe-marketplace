'use client'

import { useAdminMutation } from '@/hooks/useAdminMutation'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import type { ShipmentSyncResponse } from '@/types/shipping'

export default function ShipmentSyncButton({
  shipmentId,
  label,
}: {
  shipmentId?: string
  label?: string
}) {
  const mutation = useAdminMutation()

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="ui-secondary-button"
        disabled={mutation.isPending}
        onClick={() => {
          void mutation.execute<ShipmentSyncResponse>({
            url: API_ROUTES.adminShipmentsSync,
            body: shipmentId ? { shipmentId } : { limit: 50 },
            successMessage: shipmentId
              ? 'Shipment status synchronized.'
              : 'Pending shipment statuses synchronized.',
            fallbackErrorMessage: 'Не вдалося синхронізувати shipment statuses.',
          })
        }}
      >
        {mutation.isPending ? 'Синхронізуємо...' : (label ?? 'Синхронізувати shipment statuses')}
      </button>
      {mutation.errorMessage ? <p className="text-sm text-brand-danger">{mutation.errorMessage}</p> : null}
    </div>
  )
}
