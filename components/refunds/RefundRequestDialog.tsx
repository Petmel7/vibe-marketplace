'use client'

import { useEffect, useId, useRef } from 'react'
import { useRouter } from 'next/navigation'
import RefundReasonSelect from './RefundReasonSelect'
import { useRefundRequest } from '@/hooks/useRefundRequest'

export default function RefundRequestDialog({
  orderId,
  orderItemId,
  suggestedAmount,
  productName,
  triggerLabel = 'Запросити повернення',
  triggerClassName = 'ui-secondary-button',
}: {
  orderId: string
  orderItemId: string
  suggestedAmount?: string
  productName?: string | null
  triggerLabel?: string
  triggerClassName?: string
}) {
  const router = useRouter()
  const titleId = useId()
  const amountInputRef = useRef<HTMLInputElement>(null)
  const dialog = useRefundRequest({
    orderId,
    orderItemId,
    initialAmount: suggestedAmount,
    onSuccess: (refundId) => {
      router.push(`/profile/refunds/${refundId}`)
    },
  })

  useEffect(() => {
    if (dialog.isOpen) {
      amountInputRef.current?.focus()
    }
  }, [dialog.isOpen])

  return (
    <>
      <button type="button" className={triggerClassName} onClick={dialog.open}>
        {triggerLabel}
      </button>

      {dialog.isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-title`}
            className="w-full max-w-2xl rounded-[28px] border border-panelBorder bg-background p-6 shadow-2xl"
          >
            <div className="space-y-2">
              <h2 id={`${titleId}-title`} className="text-xl font-semibold text-copy-strong">
                Запит на повернення
              </h2>
              <p className="text-sm text-copy-muted">
                {productName
                  ? `Опишіть причину повернення для "${productName}". Остаточну доступну суму backend перевірить повторно.`
                  : 'Опишіть причину повернення. Остаточну доступну суму backend перевірить повторно.'}
              </p>
            </div>

            <div className="mt-5 space-y-5">
              <label className="block space-y-2">
                <span className="block text-sm font-medium text-copy-strong">Причина</span>
                <RefundReasonSelect
                  id={`${titleId}-reason`}
                  value={dialog.reason}
                  onChange={dialog.setReason}
                  disabled={dialog.isPending}
                />
              </label>

              <label className="block space-y-2">
                <span className="block text-sm font-medium text-copy-strong">Сума повернення</span>
                <input
                  ref={amountInputRef}
                  type="text"
                  inputMode="decimal"
                  value={dialog.amount}
                  onChange={(event) => dialog.setAmount(event.target.value)}
                  className="ui-surface-input"
                  aria-invalid={dialog.errorMessage ? 'true' : 'false'}
                  placeholder="0.00"
                />
                <p className="text-xs text-copy-muted">
                  Якщо частина суми вже була повернена або застосовувався купон, фінальний ліміт backend перерахує автоматично.
                </p>
              </label>

              <label className="block space-y-2">
                <span className="block text-sm font-medium text-copy-strong">
                  Опис {dialog.reason === 'OTHER' ? '(обов’язково)' : '(необов’язково)'}
                </span>
                <textarea
                  value={dialog.description}
                  onChange={(event) => dialog.setDescription(event.target.value)}
                  className="min-h-32 w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
                  aria-invalid={dialog.errorMessage ? 'true' : 'false'}
                  maxLength={4000}
                  placeholder="Що саме сталося з товаром або замовленням?"
                />
              </label>

              {dialog.errorMessage ? (
                <p
                  className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary"
                  aria-live="polite"
                >
                  {dialog.errorMessage}
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="ui-secondary-button" disabled={dialog.isPending} onClick={dialog.close}>
                Закрити
              </button>
              <button
                type="button"
                className="ui-primary-button disabled:cursor-not-allowed disabled:opacity-60"
                disabled={dialog.isPending}
                onClick={() => void dialog.submit()}
              >
                {dialog.isPending ? 'Надсилаємо...' : 'Створити запит'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
