import SellerStatePanel from '@/components/seller/SellerStatePanel'
import type { SellerVerificationStatus } from '@/types/seller'

export default function SellerStatusCard({
  title,
  description,
  status,
  reason,
  actionHref,
  actionLabel,
}: {
  title: string
  description: string
  status?: SellerVerificationStatus | null
  reason?: string | null
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <SellerStatePanel
      title={title}
      description={description}
      status={status}
      reason={reason}
      actionHref={actionHref}
      actionLabel={actionLabel}
    />
  )
}
