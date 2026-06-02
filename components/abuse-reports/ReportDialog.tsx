'use client'

import { useEffect, useId, useRef } from 'react'
import ReportReasonSelect from './ReportReasonSelect'
import type { AbuseReportTargetType } from '@/types/abuse-reports'
import { useReportDialog } from '@/hooks/useReportDialog'

function getTargetTypeLabel(targetType: AbuseReportTargetType) {
  switch (targetType) {
    case 'PRODUCT':
      return 'товар'
    case 'REVIEW':
      return 'відгук'
    case 'STORE':
      return 'магазин'
    case 'USER':
      return 'користувача'
    case 'ORDER':
      return 'замовлення'
  }
}

export default function ReportDialog({
  targetType,
  targetId,
  title,
  description,
  triggerLabel = 'Поскаржитися',
  triggerClassName = 'ui-secondary-button',
}: {
  targetType: AbuseReportTargetType
  targetId: string
  title?: string
  description?: string
  triggerLabel?: string
  triggerClassName?: string
}) {
  const dialog = useReportDialog({ targetType, targetId })
  const descriptionId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (dialog.isOpen) {
      textareaRef.current?.focus()
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
            aria-labelledby={`${descriptionId}-title`}
            className="w-full max-w-xl rounded-[28px] border border-panelBorder bg-background p-6 shadow-2xl"
          >
            <div className="space-y-2">
              <h2 id={`${descriptionId}-title`} className="text-xl font-semibold text-copy-strong">
                {title ?? `Поскаржитися на ${getTargetTypeLabel(targetType)}`}
              </h2>
              <p className="text-sm text-copy-muted">
                {description ??
                  'Опишіть проблему, і команда безпеки маркетплейсу перевірить звернення.'}
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block space-y-2">
                <span className="block text-sm font-medium text-copy-strong">Причина</span>
                <ReportReasonSelect
                  id={`${descriptionId}-reason`}
                  value={dialog.reason}
                  onChange={dialog.setReason}
                />
              </label>

              <label className="block space-y-2">
                <span className="block text-sm font-medium text-copy-strong">
                  Опис {dialog.isDescriptionRequired ? '(обов’язково)' : '(необов’язково)'}
                </span>
                <textarea
                  ref={textareaRef}
                  value={dialog.description}
                  onChange={(event) => dialog.setDescription(event.target.value)}
                  className="min-h-32 w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
                  aria-invalid={dialog.errorMessage ? 'true' : 'false'}
                  aria-describedby={dialog.errorMessage ? `${descriptionId}-error` : undefined}
                  maxLength={2000}
                  placeholder="Що саме сталося?"
                />
              </label>

              {dialog.errorMessage ? (
                <p
                  id={`${descriptionId}-error`}
                  className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary"
                  aria-live="polite"
                >
                  {dialog.errorMessage}
                </p>
              ) : null}

              {dialog.successMessage ? (
                <p
                  className="rounded-2xl border border-brand-success/30 bg-brand-success/10 px-4 py-3 text-sm text-copy-primary"
                  aria-live="polite"
                >
                  {dialog.successMessage}
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
                onClick={dialog.submit}
              >
                {dialog.isPending ? 'Надсилаємо...' : 'Надіслати скаргу'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
