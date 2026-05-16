'use client'

import ModerationActionDialog from '@/components/admin/ModerationActionDialog'
import {
  canAdminApproveProduct,
  canAdminArchiveProduct,
  canAdminRejectProduct,
  canAdminRestoreProduct,
} from '@/types/admin'

export default function AdminProductModerationActions({
  productId,
  status,
}: {
  productId: string
  status: string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {canAdminApproveProduct(status) ? (
        <ModerationActionDialog
          triggerLabel="Approve"
          title="Approve product"
          description="This will publish the product into the marketplace catalog."
          endpoint={`/api/admin/moderation/products/${productId}/approve`}
          actionLabel="Approve product"
          successMessage="Product approved."
          tone="success"
        />
      ) : null}

      {canAdminRejectProduct(status) ? (
        <ModerationActionDialog
          triggerLabel="Reject"
          title="Reject product"
          description="Add moderation feedback so the seller can address the issues before resubmitting."
          endpoint={`/api/admin/moderation/products/${productId}/reject`}
          actionLabel="Reject product"
          successMessage="Product rejected."
          reasonLabel="Moderation reason"
          reasonRequired
          reasonMinLength={1}
          tone="danger"
        />
      ) : null}

      {canAdminArchiveProduct(status) ? (
        <ModerationActionDialog
          triggerLabel="Archive"
          title="Archive product"
          description="Archiving removes the listing from active marketplace circulation while preserving a moderation record."
          endpoint={`/api/admin/moderation/products/${productId}/archive`}
          actionLabel="Archive product"
          successMessage="Product archived."
          reasonLabel="Archive note"
          tone="secondary"
        />
      ) : null}

      {canAdminRestoreProduct(status) ? (
        <ModerationActionDialog
          triggerLabel="Restore"
          title="Restore product to draft"
          description="Restoring sends the product back to draft so the seller can update and resubmit it."
          endpoint={`/api/admin/moderation/products/${productId}/restore`}
          actionLabel="Restore product"
          successMessage="Product restored."
          tone="success"
        />
      ) : null}
    </div>
  )
}
