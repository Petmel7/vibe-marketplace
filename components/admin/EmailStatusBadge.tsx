import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import {
  formatEmailEventLabel,
  getEmailDeliveryStatusTone,
  getEmailEventStatusTone,
  type AdminEmailDeliveryStatus,
  type AdminEmailEventStatus,
} from '@/types/admin-emails'

export default function EmailStatusBadge({
  status,
  kind = 'event',
}: {
  status: AdminEmailEventStatus | AdminEmailDeliveryStatus
  kind?: 'event' | 'delivery'
}) {
  const tone =
    kind === 'delivery'
      ? getEmailDeliveryStatusTone(status as AdminEmailDeliveryStatus)
      : getEmailEventStatusTone(status as AdminEmailEventStatus)

  return <AdminStatusBadge label={formatEmailEventLabel(status)} tone={tone} />
}
