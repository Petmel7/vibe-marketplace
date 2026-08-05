'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import FormError from '@/components/ui/form/FormError'
import DialogBody from './DialogBody'
import DialogFooter from './DialogFooter'
import DialogHeader from './DialogHeader'
import DialogShell from './DialogShell'

type TextareaActionVariant = 'danger' | 'primary' | 'secondary' | 'success'

const actionClassName: Record<TextareaActionVariant, string> = {
  danger: 'rounded-2xl bg-brand-danger px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50',
  primary: 'ui-primary-button',
  secondary: 'ui-secondary-button',
  success: 'rounded-2xl bg-brand-success px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50',
}

export default function TextareaActionDialog({
  open,
  title,
  description,
  label,
  placeholder,
  required = false,
  maxLength,
  minLength = 0,
  confirmLabel,
  cancelLabel = 'Скасувати',
  loading = false,
  actionVariant = 'primary',
  errorMessage,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: ReactNode
  description?: ReactNode
  label: ReactNode
  placeholder?: string
  required?: boolean
  maxLength?: number
  minLength?: number
  confirmLabel: string
  cancelLabel?: string
  loading?: boolean
  actionVariant?: TextareaActionVariant
  errorMessage?: ReactNode
  onCancel: () => void
  onConfirm: (value: string) => void
}) {
  const titleId = useId()
  const textareaId = useId()
  const errorId = `${textareaId}-error`
  const descriptionId = description ? `${titleId}-description` : undefined
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleConfirm = () => {
    const trimmedValue = value.trim()

    if (required && trimmedValue.length === 0) {
      setValidationError('Заповніть поле, щоб продовжити.')
      return
    }

    if (minLength > 0 && trimmedValue.length < minLength) {
      setValidationError(`Введіть щонайменше ${minLength} символів.`)
      return
    }

    setValidationError(null)
    onConfirm(trimmedValue)
  }

  return (
    <DialogShell
      open={open}
      labelledBy={titleId}
      describedBy={descriptionId}
      onClose={onCancel}
      initialFocusRef={textareaRef}
    >
      <DialogHeader title={title} description={description} titleId={titleId} descriptionId={descriptionId} />
      <DialogBody>
        <label htmlFor={textareaId} className="block space-y-2">
          <span className="ui-form-label">{label}</span>
          <textarea
            ref={textareaRef}
            id={textareaId}
            value={value}
            maxLength={maxLength}
            placeholder={placeholder}
            className="ui-surface-input min-h-28 resize-y"
            aria-invalid={validationError || errorMessage ? 'true' : 'false'}
            aria-describedby={validationError || errorMessage ? errorId : undefined}
            onChange={(event) => {
              setValidationError(null)
              setValue(event.target.value)
            }}
          />
        </label>
        <FormError id={errorId}>{validationError || errorMessage}</FormError>
      </DialogBody>
      <DialogFooter className="sm:justify-end">
        <button type="button" className="ui-secondary-button" disabled={loading} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className={actionClassName[actionVariant]} disabled={loading} onClick={handleConfirm}>
          {loading ? 'Зачекайте…' : confirmLabel}
        </button>
      </DialogFooter>
    </DialogShell>
  )
}
