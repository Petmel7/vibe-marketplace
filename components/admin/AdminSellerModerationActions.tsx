'use client'

import ModerationActionDialog from '@/components/admin/ModerationActionDialog'
import {
  canAdminApproveSeller,
  canAdminReactivateSeller,
  canAdminRejectSeller,
  canAdminSuspendSeller,
} from '@/types/admin'

export default function AdminSellerModerationActions({
  sellerId,
  verificationStatus,
}: {
  sellerId: string
  verificationStatus: string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {canAdminApproveSeller(verificationStatus) ? (
        <ModerationActionDialog
          triggerLabel="Approve"
          title="Approve seller"
          description="This will verify the seller and unlock the seller workspace."
          endpoint={`/api/admin/moderation/sellers/${sellerId}/approve`}
          actionLabel="Approve seller"
          successMessage="Seller approved."
          tone="success"
        />
      ) : null}

      {canAdminRejectSeller(verificationStatus) ? (
        <ModerationActionDialog
          triggerLabel="Reject"
          title="Reject seller application"
          description="Provide a clear moderation reason so the seller understands what must change before reapplying."
          endpoint={`/api/admin/moderation/sellers/${sellerId}/reject`}
          actionLabel="Reject seller"
          successMessage="Seller rejected."
          reasonLabel="Moderation reason"
          reasonRequired
          reasonMinLength={10}
          tone="danger"
        />
      ) : null}

      {canAdminSuspendSeller(verificationStatus) ? (
        <ModerationActionDialog
          triggerLabel="Suspend"
          title="Suspend seller"
          description="Suspending a seller pauses storefront operations and deactivates owned stores."
          endpoint={`/api/admin/moderation/sellers/${sellerId}/suspend`}
          actionLabel="Suspend seller"
          successMessage="Seller suspended."
          reasonLabel="Suspension reason"
          reasonRequired
          reasonMinLength={1}
          tone="danger"
        />
      ) : null}

      {canAdminReactivateSeller(verificationStatus) ? (
        <ModerationActionDialog
          triggerLabel="Reactivate"
          title="Reactivate seller"
          description="This restores the seller to a verified state."
          endpoint={`/api/admin/moderation/sellers/${sellerId}/reactivate`}
          actionLabel="Reactivate seller"
          successMessage="Seller reactivated."
          tone="success"
        />
      ) : null}
    </div>
  )
}
