import SellerStatusBadge from '@/components/seller/SellerStatusBadge'
import type { SellerFulfillmentStatus } from '@/types/seller'

const FULFILLMENT_STATUS_LABELS: Record<SellerFulfillmentStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
}

const FULFILLMENT_STATUS_TONES: Record<SellerFulfillmentStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  SHIPPED: 'neutral',
  DELIVERED: 'success',
}

export default function FulfillmentStatusBadge({
  status,
}: {
  status: SellerFulfillmentStatus
}) {
  return <SellerStatusBadge label={FULFILLMENT_STATUS_LABELS[status]} tone={FULFILLMENT_STATUS_TONES[status]} />
}
