import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import { getPayoutStatusLabel, type PayoutStatus } from '@/types/payouts'

const STATUS_TONES: Record<PayoutStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  PAID: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
}

export default function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  return <AdminStatusBadge label={getPayoutStatusLabel(status)} tone={STATUS_TONES[status]} />
}
