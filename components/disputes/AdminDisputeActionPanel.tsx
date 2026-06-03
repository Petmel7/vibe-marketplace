'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { disputesApi } from './api/disputes.api'
import type { DisputeDetail, DisputeStatus } from '@/types/disputes'

const STATUS_ACTIONS: Array<{
  value: Extract<DisputeStatus, 'UNDER_REVIEW' | 'WAITING_BUYER' | 'WAITING_SELLER' | 'ESCALATED'>
  label: string
}> = [
  { value: 'UNDER_REVIEW', label: 'Взяти в роботу' },
  { value: 'WAITING_BUYER', label: 'Очікуємо покупця' },
  { value: 'WAITING_SELLER', label: 'Очікуємо продавця' },
  { value: 'ESCALATED', label: 'Ескалювати' },
]

const RESOLUTION_ACTIONS: Array<{
  value: Extract<DisputeStatus, 'RESOLVED' | 'REJECTED' | 'CLOSED'>
  label: string
}> = [
  { value: 'RESOLVED', label: 'Вирішити' },
  { value: 'REJECTED', label: 'Відхилити' },
  { value: 'CLOSED', label: 'Закрити' },
]

export default function AdminDisputeActionPanel({ dispute }: { dispute: DisputeDetail }) {
  const router = useRouter()
  const [resolutionNote, setResolutionNote] = useState(dispute.resolutionNote ?? '')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function runAction(task: () => Promise<unknown>, successText: string) {
    setErrorMessage(null)
    setSuccessMessage(null)

    startTransition(async () => {
      try {
        await task()
        setSuccessMessage(successText)
        router.refresh()
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Не вдалося оновити статус суперечки.',
        )
      }
    })
  }

  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-copy-strong">Дії адміністратора</h2>
          <p className="mt-1 text-sm text-copy-muted">
            Оновлюйте статус розгляду, залишайте резолюцію та рухайте суперечку до завершення.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-copy-muted">Статус розгляду</p>
          <div className="flex flex-wrap gap-3">
            {STATUS_ACTIONS.map((action) => (
              <button
                key={action.value}
                type="button"
                disabled={isPending}
                className="ui-secondary-button disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() =>
                  runAction(
                    () => disputesApi.updateAdminStatus(dispute.id, { status: action.value }),
                    'Статус суперечки оновлено.',
                  )
                }
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-copy-muted">
              Резолюція / нотатка
            </span>
            <textarea
              value={resolutionNote}
              onChange={(event) => setResolutionNote(event.target.value)}
              className="min-h-28 w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
              placeholder="Опишіть рішення, рекомендацію щодо повернення коштів або причину відхилення"
              maxLength={4000}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            {RESOLUTION_ACTIONS.map((action) => (
              <button
                key={action.value}
                type="button"
                disabled={isPending || resolutionNote.trim().length < 5}
                className="ui-primary-button disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() =>
                  runAction(
                    () =>
                      disputesApi.resolveAdminDispute(dispute.id, {
                        status: action.value,
                        resolutionNote: resolutionNote.trim(),
                      }),
                    'Рішення по суперечці збережено.',
                  )
                }
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {errorMessage ? (
          <p className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-2xl border border-brand-success/30 bg-brand-success/10 px-4 py-3 text-sm text-copy-primary">
            {successMessage}
          </p>
        ) : null}
      </div>
    </section>
  )
}
