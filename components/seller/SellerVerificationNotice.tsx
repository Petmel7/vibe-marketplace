import SellerStatePanel from '@/components/seller/SellerStatePanel'
import type { SellerVerificationStatus } from '@/types/seller'

export default function SellerVerificationNotice({
  status,
  reason,
}: {
  status: SellerVerificationStatus | null | undefined
  reason?: string | null
}) {
  if (!status || status === 'VERIFIED') {
    return null
  }

  if (status === 'PENDING') {
    return (
      <SellerStatePanel
        title="Verification is in progress"
        description="Your seller account is under review. You can prepare product data and store settings while marketplace activation remains gated."
        status={status}
        actionHref="/seller/store"
        actionLabel="Review store readiness"
      />
    )
  }

  if (status === 'REJECTED') {
    return (
      <SellerStatePanel
        title="Seller verification was rejected"
        description="Review the moderation feedback, update your store information, and coordinate the next verification step before resuming seller operations."
        status={status}
        reason={reason}
        actionHref="/seller/store"
        actionLabel="Open store settings"
      />
    )
  }

  return (
    <SellerStatePanel
      title="Seller account is suspended"
      description="Storefront operations are paused until moderation clears the suspension. You can still review dashboard information and account context here."
      status={status}
      reason={reason}
      actionHref="/seller/store"
      actionLabel="View store status"
    />
  )
}
