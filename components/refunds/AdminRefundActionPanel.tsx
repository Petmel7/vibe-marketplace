'use client'

import RefundActionDialog from './RefundActionDialog'
import { useAdminRefunds } from '@/hooks/useAdminRefunds'
import type { AdminRefundRequest } from '@/types/refunds'

export default function AdminRefundActionPanel({ refund }: { refund: AdminRefundRequest }) {
  const actions = useAdminRefunds()

  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-copy-strong">Дії адміністратора</h2>
          <p className="mt-1 text-sm text-copy-muted">
            Усі фінансові зміни виконуються лише через backend-переходи станів і логуються в audit trail.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <RefundActionDialog
            title="Взяти повернення на розгляд"
            description="Позначте запит як такий, що вже опрацьовується командою."
            triggerLabel="Under review"
            confirmLabel="Підтвердити"
            onConfirm={async (note) => {
              await actions.updateStatus(refund.id, {
                status: 'UNDER_REVIEW',
                ...(note ? { adminNote: note } : {}),
              })
            }}
          />
          <RefundActionDialog
            title="Схвалити повернення"
            description="Підтвердіть, що запит переходить до наступного етапу ручної обробки."
            triggerLabel="Approve"
            confirmLabel="Схвалити"
            triggerClassName="ui-primary-button"
            onConfirm={async (note) => {
              await actions.approve(refund.id, note || undefined)
            }}
          />
          <RefundActionDialog
            title="Відхилити повернення"
            description="Вкажіть безпечне пояснення, яке backend збереже для покупця."
            triggerLabel="Reject"
            confirmLabel="Відхилити"
            requireNote
            onConfirm={async (note) => {
              await actions.reject(refund.id, note)
            }}
          />
          <RefundActionDialog
            title="Перевести у processing"
            description="Позначте, що команда вже вручну проводить повернення."
            triggerLabel="Mark processing"
            confirmLabel="Оновити"
            onConfirm={async (note) => {
              await actions.markProcessing(refund.id, note || undefined)
            }}
          />
          <RefundActionDialog
            title="Підтвердити успішне повернення"
            description="Ця дія вплине на refund record, buyer notifications та seller ledger reversal."
            triggerLabel="Mark succeeded"
            confirmLabel="Підтвердити"
            triggerClassName="ui-primary-button"
            onConfirm={async (note) => {
              await actions.markSucceeded(refund.id, note || undefined)
            }}
          />
          <RefundActionDialog
            title="Позначити повернення як невдале"
            description="Використовуйте це лише якщо ручне повернення не вдалося завершити."
            triggerLabel="Mark failed"
            confirmLabel="Позначити failed"
            onConfirm={async (note) => {
              await actions.markFailed(refund.id, note || undefined)
            }}
          />
          <RefundActionDialog
            title="Скасувати запит на повернення"
            description="Скасування доступне лише коли backend дозволяє такий перехід."
            triggerLabel="Cancel request"
            confirmLabel="Скасувати"
            onConfirm={async (note) => {
              await actions.updateStatus(refund.id, {
                status: 'CANCELLED',
                ...(note ? { adminNote: note } : {}),
              })
            }}
          />
        </div>

        {actions.errorMessage ? (
          <p className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
            {actions.errorMessage}
          </p>
        ) : null}
      </div>
    </section>
  )
}
