import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import type { RefundRequestStatus } from '@/types/refunds'
import { getRefundStatusLabel } from '@/types/refunds'

const STATUS_TONES: Record<RefundRequestStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  REQUESTED: 'warning',
  UNDER_REVIEW: 'info',
  APPROVED: 'success',
  REJECTED: 'danger',
  PROCESSING: 'info',
  SUCCEEDED: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
}

export default function RefundStatusBadge({ status }: { status: RefundRequestStatus }) {
  return (
    <span className="inline-flex w-fit whitespace-nowrap">
      <AdminStatusBadge label={getRefundStatusLabel(status)} tone={STATUS_TONES[status]} />
    </span>
  )
}
