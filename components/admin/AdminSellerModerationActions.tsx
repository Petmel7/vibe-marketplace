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
          triggerLabel="Схвалити"
          title="Схвалити продавця"
          description="Ця дія підтвердить продавця й відкриє seller workspace."
          endpoint={`/api/admin/moderation/sellers/${sellerId}/approve`}
          actionLabel="Схвалити продавця"
          successMessage="Продавця схвалено."
          tone="success"
        />
      ) : null}

      {canAdminRejectSeller(verificationStatus) ? (
        <ModerationActionDialog
          triggerLabel="Відхилити"
          title="Відхилити заявку продавця"
          description="Вкажіть зрозумілу причину модерації, щоб продавець розумів, що потрібно змінити перед повторною подачею."
          endpoint={`/api/admin/moderation/sellers/${sellerId}/reject`}
          actionLabel="Відхилити продавця"
          successMessage="Продавця відхилено."
          reasonLabel="Причина модерації"
          reasonRequired
          reasonMinLength={10}
          tone="danger"
        />
      ) : null}

      {canAdminSuspendSeller(verificationStatus) ? (
        <ModerationActionDialog
          triggerLabel="Призупинити"
          title="Призупинити продавця"
          description="Призупинення зупиняє роботу вітрини продавця та деактивує пов’язані магазини."
          endpoint={`/api/admin/moderation/sellers/${sellerId}/suspend`}
          actionLabel="Призупинити продавця"
          successMessage="Продавця призупинено."
          reasonLabel="Причина призупинення"
          reasonRequired
          reasonMinLength={1}
          tone="danger"
        />
      ) : null}

      {canAdminReactivateSeller(verificationStatus) ? (
        <ModerationActionDialog
          triggerLabel="Відновити"
          title="Відновити продавця"
          description="Ця дія поверне продавця до підтвердженого стану."
          endpoint={`/api/admin/moderation/sellers/${sellerId}/reactivate`}
          actionLabel="Відновити продавця"
          successMessage="Продавця відновлено."
          tone="success"
        />
      ) : null}
    </div>
  )
}
