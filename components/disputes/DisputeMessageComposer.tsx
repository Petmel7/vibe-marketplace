'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { disputesApi } from './api/disputes.api'

export default function DisputeMessageComposer({
  disputeId,
  allowInternalNotes = false,
  submitLabel = 'Надіслати повідомлення',
}: {
  disputeId: string
  allowInternalNotes?: boolean
  submitLabel?: string
}) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    startTransition(async () => {
      try {
        await disputesApi.sendMessage(disputeId, {
          message: message.trim(),
          ...(allowInternalNotes ? { isInternal } : {}),
        })
        setMessage('')
        setIsInternal(false)
        setSuccessMessage(allowInternalNotes && isInternal ? 'Нотатку збережено.' : 'Повідомлення надіслано.')
        router.refresh()
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Не вдалося надіслати повідомлення.',
        )
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="space-y-2">
        <span className="text-sm font-medium text-copy-strong">Нове повідомлення</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="min-h-28 w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
          placeholder="Опишіть уточнення, відповідь або нові деталі щодо суперечки"
          maxLength={5000}
          aria-invalid={errorMessage ? 'true' : 'false'}
        />
      </label>

      {allowInternalNotes ? (
        <label className="flex items-center gap-3 text-sm text-copy-secondary">
          <input
            type="checkbox"
            checked={isInternal}
            onChange={(event) => setIsInternal(event.target.checked)}
            className="h-4 w-4 rounded border-panelBorder text-brand-accent focus:ring-brand-accent"
          />
          <span>Зберегти як внутрішню нотатку адміністратора</span>
        </label>
      ) : null}

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

      <button
        type="submit"
        disabled={isPending || !message.trim()}
        className="ui-primary-button disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Надсилаємо...' : submitLabel}
      </button>
    </form>
  )
}
