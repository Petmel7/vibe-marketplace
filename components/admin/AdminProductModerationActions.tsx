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
          triggerLabel="Схвалити"
          title="Схвалити товар"
          description="Ця дія опублікує товар у каталозі маркетплейсу."
          endpoint={`/api/admin/moderation/products/${productId}/approve`}
          actionLabel="Схвалити товар"
          successMessage="Товар схвалено."
          tone="success"
        />
      ) : null}

      {canAdminRejectProduct(status) ? (
        <ModerationActionDialog
          triggerLabel="Відхилити"
          title="Відхилити товар"
          description="Додайте коментар модерації, щоб продавець міг виправити проблеми перед повторною подачею."
          endpoint={`/api/admin/moderation/products/${productId}/reject`}
          actionLabel="Відхилити товар"
          successMessage="Товар відхилено."
          reasonLabel="Причина модерації"
          reasonRequired
          reasonMinLength={1}
          tone="danger"
        />
      ) : null}

      {canAdminArchiveProduct(status) ? (
        <ModerationActionDialog
          triggerLabel="Архівувати"
          title="Архівувати товар"
          description="Архівація прибирає товар з активної публічної вітрини, зберігаючи запис модерації."
          endpoint={`/api/admin/moderation/products/${productId}/archive`}
          actionLabel="Архівувати товар"
          successMessage="Товар архівовано."
          reasonLabel="Примітка до архівації"
          tone="secondary"
        />
      ) : null}

      {canAdminRestoreProduct(status) ? (
        <ModerationActionDialog
          triggerLabel="Повернути"
          title="Повернути товар у чернетку"
          description="Товар буде повернено в чернетку, щоб продавець міг оновити його та повторно відправити на модерацію."
          endpoint={`/api/admin/moderation/products/${productId}/restore`}
          actionLabel="Повернути товар"
          successMessage="Товар повернуто."
          tone="success"
        />
      ) : null}
    </div>
  )
}
