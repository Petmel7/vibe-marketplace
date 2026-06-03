'use client'

import { useEffect, useId, useRef } from 'react'
import { useRouter } from 'next/navigation'
import DisputeEvidenceUpload from './DisputeEvidenceUpload'
import DisputeReasonSelect from './DisputeReasonSelect'
import { useDisputeForm } from '@/hooks/useDisputeForm'

export default function DisputeFormDialog({
  orderId,
  orderItemId,
  title,
  description,
  triggerLabel = 'Відкрити суперечку',
  triggerClassName = 'ui-secondary-button',
}: {
  orderId: string
  orderItemId?: string | null
  title?: string
  description?: string
  triggerLabel?: string
  triggerClassName?: string
}) {
  const router = useRouter()
  const dialog = useDisputeForm({
    orderId,
    orderItemId,
    onSuccess: () => {
      router.refresh()
    },
  })
  const titleId = useId()
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
            aria-labelledby={`${titleId}-title`}
            className="w-full max-w-2xl rounded-[28px] border border-panelBorder bg-background p-6 shadow-2xl"
          >
            <div className="space-y-2">
              <h2 id={`${titleId}-title`} className="text-xl font-semibold text-copy-strong">
                {title ?? 'Відкрити суперечку'}
              </h2>
              <p className="text-sm text-copy-muted">
                {description ??
                  'Опишіть проблему із замовленням, додайте деталі та, за потреби, прикріпіть зображення або PDF-докази.'}
              </p>
            </div>

            <div className="mt-5 space-y-5">
              <label className="block space-y-2">
                <span className="block text-sm font-medium text-copy-strong">Причина</span>
                <DisputeReasonSelect
                  id={`${titleId}-reason`}
                  value={dialog.reason}
                  onChange={dialog.setReason}
                />
              </label>

              <label className="block space-y-2">
                <span className="block text-sm font-medium text-copy-strong">Опис проблеми</span>
                <textarea
                  ref={textareaRef}
                  value={dialog.description}
                  onChange={(event) => dialog.setDescription(event.target.value)}
                  className="min-h-32 w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
                  aria-invalid={dialog.errorMessage ? 'true' : 'false'}
                  maxLength={4000}
                  placeholder="Що саме сталося із замовленням або товаром?"
                />
              </label>

              <DisputeEvidenceUpload
                disabled={dialog.isPending}
                selectedFiles={dialog.selectedFiles}
                errorMessage={dialog.fileErrorMessage}
                onFilesSelected={dialog.addFiles}
                onRemoveFile={dialog.removeFile}
              />

              {dialog.uploadProgress ? (
                <p className="rounded-2xl border border-panelBorder bg-panelAlt px-4 py-3 text-sm text-copy-secondary">
                  {dialog.uploadProgress.completed < dialog.uploadProgress.total
                    ? `Завантажуємо докази: ${dialog.uploadProgress.completed}/${dialog.uploadProgress.total}. ${
                        dialog.uploadProgress.currentFileName
                          ? `Поточний файл: ${dialog.uploadProgress.currentFileName}`
                          : ''
                      }`
                    : `Докази оброблено: ${dialog.uploadProgress.completed}/${dialog.uploadProgress.total}.`}
                </p>
              ) : null}

              {dialog.errorMessage ? (
                <p
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
                onClick={() => void dialog.submit()}
              >
                {dialog.isPending ? 'Створюємо...' : 'Відкрити суперечку'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
