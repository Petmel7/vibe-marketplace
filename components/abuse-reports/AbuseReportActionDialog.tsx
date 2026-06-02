'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { abuseReportsApi } from '@/components/abuse-reports/api/abuse-reports.api'
import type { AbuseReportActionType, AbuseReportStatus } from '@/types/abuse-reports'

type Mode =
  | {
      kind: 'status'
      status: AbuseReportStatus
      endpointId: string
      title: string
      description: string
      successMessage: string
      requireNote?: boolean
      noteLabel?: string
      tone?: 'secondary' | 'danger' | 'success'
      triggerLabel: string
    }
  | {
      kind: 'action'
      actionType: AbuseReportActionType
      endpointId: string
      title: string
      description: string
      successMessage: string
      requireNote?: boolean
      noteLabel?: string
      tone?: 'secondary' | 'danger' | 'success'
      triggerLabel: string
    }

export default function AbuseReportActionDialog(props: Mode) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [note, setNote] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const noteId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus()
    }
  }, [isOpen])

  const triggerClassName = {
    secondary: 'ui-secondary-button',
    danger:
      'rounded-2xl bg-brand-danger px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50',
    success:
      'rounded-2xl bg-brand-success px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50',
  }[props.tone ?? 'secondary']

  async function handleSubmit() {
    if (isPending) return

    if (props.requireNote && note.trim().length < 5) {
      setErrorMessage('Додайте коротке пояснення перед підтвердженням дії.')
      return
    }

    setIsPending(true)
    setErrorMessage(null)

    try {
      if (props.kind === 'status') {
        await abuseReportsApi.updateAdminStatus(props.endpointId, {
          status: props.status,
          ...(note.trim() ? { resolutionNote: note.trim() } : {}),
        })
      } else {
        await abuseReportsApi.createAdminAction(props.endpointId, {
          actionType: props.actionType,
          ...(note.trim() ? { note: note.trim() } : {}),
        })
      }

      toast.success(props.successMessage)
      setIsOpen(false)
      setNote('')
      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Не вдалося виконати дію. Спробуйте ще раз.',
      )
      toast.error(error instanceof Error ? error.message : 'Не вдалося виконати дію.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setIsOpen(true)}>
        {props.triggerLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${noteId}-title`}
            className="w-full max-w-lg rounded-[28px] border border-panelBorder bg-background p-6 shadow-2xl"
          >
            <div className="space-y-2">
              <h2 id={`${noteId}-title`} className="text-xl font-semibold text-copy-strong">
                {props.title}
              </h2>
              <p className="text-sm text-copy-muted">{props.description}</p>
            </div>

            <label className="mt-5 block space-y-2">
              <span className="block text-sm font-medium text-copy-strong">
                {props.noteLabel ?? 'Примітка'}
              </span>
              <textarea
                ref={textareaRef}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="min-h-28 w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
                aria-invalid={errorMessage ? 'true' : 'false'}
                aria-describedby={errorMessage ? `${noteId}-error` : undefined}
              />
            </label>

            {errorMessage ? (
              <p
                id={`${noteId}-error`}
                className="mt-4 rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary"
                aria-live="polite"
              >
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="ui-secondary-button"
                disabled={isPending}
                onClick={() => {
                  setIsOpen(false)
                  setNote('')
                  setErrorMessage(null)
                }}
              >
                Скасувати
              </button>
              <button
                type="button"
                className={triggerClassName}
                disabled={isPending}
                onClick={() => void handleSubmit()}
              >
                {isPending ? 'Працюємо...' : 'Підтвердити'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
