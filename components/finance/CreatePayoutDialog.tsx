'use client'

import { useId, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminPayouts } from '@/hooks/useAdminPayouts'
import MoneyAmount from './MoneyAmount'
import type { SellerBalance } from '@/types/payouts'

export default function CreatePayoutDialog({ balance }: { balance: SellerBalance }) {
  const router = useRouter()
  const titleId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [method, setMethod] = useState<'MANUAL' | 'BANK_TRANSFER'>('MANUAL')
  const [reference, setReference] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [amount, setAmount] = useState(balance.availableAmount)
  const { createPayout, isPending, errorMessage, setErrorMessage } = useAdminPayouts()

  function resetFormState() {
    setAmount(balance.availableAmount)
    setMethod('MANUAL')
    setReference('')
    setAdminNote('')
    setErrorMessage(null)
  }

  const mismatch = useMemo(() => amount !== balance.availableAmount, [amount, balance.availableAmount])

  return (
    <>
      <button
        type="button"
        className="ui-secondary-button"
        disabled={Number(balance.availableAmount) <= 0}
        onClick={() => {
          resetFormState()
          setIsOpen(true)
        }}
      >
        Створити виплату
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-title`}
            className="w-full max-w-2xl rounded-[28px] border border-panelBorder bg-background p-6 shadow-2xl"
          >
            <div className="space-y-2">
              <h2 id={`${titleId}-title`} className="text-xl font-semibold text-copy-strong">
                Створити ручну виплату
              </h2>
              <p className="text-sm text-copy-muted">
                Для MVP payout amount має точно збігатися з поточним доступним серверним ledger batch. Часткові виплати поки не підтримуються.
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-panelBorder bg-panel p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Store</p>
                <p className="mt-2 font-semibold text-copy-strong">{balance.storeName}</p>
                <p className="mt-1 text-sm text-copy-muted">{balance.sellerEmail}</p>
              </div>
              <div className="rounded-2xl border border-panelBorder bg-panel p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Available batch</p>
                <p className="mt-2 text-lg font-semibold text-copy-strong">
                  <MoneyAmount amount={balance.availableAmount} currency={balance.currency} />
                </p>
                <p className="mt-1 text-sm text-copy-muted">Server-calculated available ledger entries</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block space-y-2">
                <span className="block text-sm font-medium text-copy-strong">Спосіб виплати</span>
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value as 'MANUAL' | 'BANK_TRANSFER')}
                  className="ui-surface-input"
                >
                  <option value="MANUAL">Ручна виплата</option>
                  <option value="BANK_TRANSFER">Банківський переказ</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="block text-sm font-medium text-copy-strong">Сума</span>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="ui-surface-input"
                  aria-invalid={mismatch ? 'true' : 'false'}
                  inputMode="decimal"
                />
                <span className="block text-xs text-copy-muted">
                  Значення має дорівнювати <strong>{balance.availableAmount}</strong>.
                </span>
              </label>

              <label className="block space-y-2">
                <span className="block text-sm font-medium text-copy-strong">Reference</span>
                <input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  className="ui-surface-input"
                  placeholder="Наприклад, bank-batch-2026-06-03"
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

              {mismatch ? (
                <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-copy-primary">
                  Сума має точно відповідати доступному ledger batch для цього store. Backend перевірить це ще раз під час створення payout.
                </p>
              ) : null}

              {errorMessage ? (
                <p className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
                  {errorMessage}
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="ui-secondary-button" disabled={isPending} onClick={() => setIsOpen(false)}>
                Закрити
              </button>
              <button
                type="button"
                className="ui-primary-button disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending || mismatch || Number(balance.availableAmount) <= 0}
                onClick={async () => {
                  const created = await createPayout({
                    storeId: balance.storeId,
                    amount,
                    method,
                    reference: reference.trim() || undefined,
                    adminNote: adminNote.trim() || undefined,
                  })

                  if (created) {
                    setIsOpen(false)
                    router.push(`/admin/payouts/${created.id}`)
                    router.refresh()
                  }
                }}
              >
                {isPending ? 'Створюємо...' : 'Створити payout'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
