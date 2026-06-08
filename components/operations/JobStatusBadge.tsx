import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import { getOperationJobStatusLabel, type OperationJobStatus } from '@/types/operations'

function getTone(status: OperationJobStatus) {
  switch (status) {
    case 'PENDING':
      return 'warning' as const
    case 'PROCESSING':
      return 'info' as const
    case 'SUCCEEDED':
      return 'success' as const
    case 'FAILED':
      return 'danger' as const
    case 'CANCELLED':
      return 'neutral' as const
  }
}

export default function JobStatusBadge({ status }: { status: OperationJobStatus }) {
  return <AdminStatusBadge label={getOperationJobStatusLabel(status)} tone={getTone(status)} />
}

