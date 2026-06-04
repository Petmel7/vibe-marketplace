import SellerStatusBadge from '@/components/seller/SellerStatusBadge'
import type { ShipmentStatus } from '@/types/shipping'
import { getShipmentStatusLabel } from '@/types/shipping'

const SHIPMENT_STATUS_TONES: Record<
  ShipmentStatus,
  'neutral' | 'success' | 'warning' | 'danger' | 'info'
> = {
  PENDING: 'warning',
  READY_TO_SHIP: 'info',
  LABEL_CREATED: 'info',
  SHIPPED: 'neutral',
  IN_TRANSIT: 'neutral',
  ARRIVED: 'success',
  DELIVERED: 'success',
  FAILED: 'danger',
  CANCELLED: 'danger',
  RETURNED: 'warning',
}

export default function ShipmentStatusBadge({
  status,
}: {
  status: ShipmentStatus
}) {
  return (
    <SellerStatusBadge
      label={getShipmentStatusLabel(status)}
      tone={SHIPMENT_STATUS_TONES[status]}
    />
  )
}
