'use client'

import { useEffect, useId, useRef, useState } from 'react'

export default function RefundActionDialog({
  title,
  description,
  confirmLabel,
  triggerLabel,
  triggerClassName = 'ui-secondary-button',
  noteLabel = 'Нотатка адміністратора',
  notePlaceholder = 'Додайте пояснення, якщо воно допоможе команді або покупцю.',
  requireNote = false,
  onConfirm,
}: {
  title: string
  description: string
  confirmLabel: string
  triggerLabel: string
  triggerClassName?: string
  noteLabel?: string
  notePlaceholder?: string
  requireNote?: boolean
  onConfirm: (note: string) => Promise<void>
}) {
  const titleId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [note, setNote] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus()
    }
  }, [isOpen])

  async function handleConfirm() {
    if (isPending) {
      return
    }

    const trimmedNote = note.trim()

    if (requireNote && !trimmedNote) {
      setErrorMessage('Додайте нотатку, щоб підтвердити цю дію.')
      return
    }

    setIsPending(true)
    setErrorMessage(null)

    try {
      await onConfirm(trimmedNote)
      setIsOpen(false)
      setNote('')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Не вдалося виконати цю дію. Спробуйте ще раз.',
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setIsOpen(true)}>
        {triggerLabel}
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
                {title}
              </h2>
              <p className="text-sm text-copy-muted">{description}</p>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-copy-strong">{noteLabel}</span>
                <textarea
                  ref={textareaRef}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="min-h-28 w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
                  aria-invalid={errorMessage ? 'true' : 'false'}
                  maxLength={4000}
                  placeholder={notePlaceholder}
                />
              </label>

              {errorMessage ? (
                <p className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
                  {errorMessage}
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="ui-secondary-button"
                disabled={isPending}
                onClick={() => {
                  if (!isPending) {
                    setIsOpen(false)
                    setErrorMessage(null)
                  }
                }}
              >
                Закрити
              </button>
              <button
                type="button"
                className="ui-primary-button disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                onClick={() => void handleConfirm()}
              >
                {isPending ? 'Зберігаємо...' : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
