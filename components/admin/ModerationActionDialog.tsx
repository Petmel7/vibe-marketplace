'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useAdminMutation } from '@/hooks/useAdminMutation'

export default function ModerationActionDialog({
  triggerLabel,
  title,
  description,
  endpoint,
  actionLabel,
  successMessage,
  reasonLabel,
  reasonRequired = false,
  reasonMinLength = 0,
  tone = 'secondary',
  disabled = false,
}: {
  triggerLabel: string
  title: string
  description: string
  endpoint: string
  actionLabel: string
  successMessage: string
  reasonLabel?: string
  reasonRequired?: boolean
  reasonMinLength?: number
  tone?: 'secondary' | 'danger' | 'success'
  disabled?: boolean
}) {
  const { execute, errorMessage, isPending, setErrorMessage } = useAdminMutation()
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const reasonId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && reasonRequired) {
      textareaRef.current?.focus()
    }
  }, [isOpen, reasonRequired])

  const triggerClassName = {
    secondary: 'ui-secondary-button',
    danger: 'rounded-2xl bg-brand-danger px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50',
    success: 'rounded-2xl bg-brand-success px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50',
  }[tone]

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        disabled={disabled}
        onClick={() => {
          setReasonError(null)
          setErrorMessage(null)
          setIsOpen(true)
        }}
      >
        {triggerLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${reasonId}-title`}
            className="w-full max-w-lg rounded-[28px] border border-panelBorder bg-background p-6 shadow-2xl"
          >
            <div className="space-y-2">
              <h2 id={`${reasonId}-title`} className="text-xl font-semibold text-copy-strong">
                {title}
              </h2>
              <p className="text-sm text-copy-muted">{description}</p>
            </div>

            {reasonLabel ? (
              <label className="mt-5 block space-y-2">
                <span className="block text-sm font-medium text-copy-strong">{reasonLabel}</span>
                <textarea
                  ref={textareaRef}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="ui-surface-input min-h-28 resize-y"
                  aria-invalid={reasonError ? 'true' : 'false'}
                  aria-describedby={reasonError ? `${reasonId}-error` : undefined}
                />
                {reasonError ? (
                  <p id={`${reasonId}-error`} className="text-sm text-brand-danger">
                    {reasonError}
                  </p>
                ) : null}
              </label>
            ) : null}

            {errorMessage ? (
              <div className="mt-5 rounded-2xl border border-brand-danger/20 bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="ui-secondary-button"
                disabled={isPending}
                onClick={() => {
                  setIsOpen(false)
                  setReason('')
                  setReasonError(null)
                  setErrorMessage(null)
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={triggerClassName}
                disabled={isPending}
                onClick={async () => {
                  if (reasonRequired && reason.trim().length < reasonMinLength) {
                    setReasonError(
                      reasonMinLength > 1
                        ? `Please enter at least ${reasonMinLength} characters.`
                        : 'Please enter a reason to continue.',
                    )
                    return
                  }

                  setReasonError(null)
                  const body = reasonLabel ? { reason: reason.trim() } : undefined
                  const data = await execute({
                    url: endpoint,
                    body,
                    successMessage,
                  })

                  if (data) {
                    setIsOpen(false)
                    setReason('')
                  }
                }}
              >
                {isPending ? 'Working...' : actionLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
