'use client'

import { useId, useState } from 'react'
import { useAdminPayouts } from '@/hooks/useAdminPayouts'
import { getPayoutStatusLabel, type PayoutStatus } from '@/types/payouts'

export default function PayoutActionDialog({
  payoutId,
  nextStatus,
  triggerLabel,
}: {
  payoutId: string
  nextStatus: PayoutStatus
  triggerLabel?: string
}) {
  const titleId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [reference, setReference] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const { updatePayoutStatus, isPending, errorMessage, setErrorMessage } = useAdminPayouts()

  return (
    <>
      <button type="button" className="ui-secondary-button" onClick={() => { setErrorMessage(null); setIsOpen(true) }}>
        {triggerLabel ?? getPayoutStatusLabel(nextStatus)}
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-title`}
            className="w-full max-w-xl rounded-[28px] border border-panelBorder bg-background p-6 shadow-2xl"
          >
            <div className="space-y-2">
              <h2 id={`${titleId}-title`} className="text-xl font-semibold text-copy-strong">
                Оновити статус виплати
              </h2>
              <p className="text-sm text-copy-muted">
                Ви збираєтесь перевести payout у стан <strong>{getPayoutStatusLabel(nextStatus)}</strong>. Фінансові дії вимагають підтвердження.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block space-y-2">
                <span className="block text-sm font-medium text-copy-strong">Reference</span>
                <input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  className="ui-surface-input"
                />
              </label>
              <label className="block space-y-2">
                <span className="block text-sm font-medium text-copy-strong">Admin note</span>
                <textarea
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  className="min-h-28 w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
                />
              </label>
              {errorMessage ? (
                <p className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
                  {errorMessage}
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="ui-secondary-button" disabled={isPending} onClick={() => setIsOpen(false)}>
                Скасувати
              </button>
              <button
                type="button"
                className="ui-primary-button disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                onClick={async () => {
                  const updated = await updatePayoutStatus(payoutId, {
                    status: nextStatus,
                    reference: reference.trim() || undefined,
                    adminNote: adminNote.trim() || undefined,
                  })
                  if (updated) {
                    setIsOpen(false)
                  }
                }}
              >
                {isPending ? 'Оновлюємо...' : 'Підтвердити'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
