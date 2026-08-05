'use client'

import { useId, type ReactNode } from 'react'
import DialogBody from './DialogBody'
import DialogFooter from './DialogFooter'
import DialogHeader from './DialogHeader'
import DialogShell from './DialogShell'

export type ConfirmVariant = 'danger' | 'primary' | 'secondary' | 'success'

export type ConfirmDialogProps = {
  open: boolean
  title: ReactNode
  description?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  confirmVariant?: ConfirmVariant
  loading?: boolean
  disabled?: boolean
  icon?: ReactNode
  children?: ReactNode
  onConfirm: () => void
  onCancel: () => void
}

const confirmClassName: Record<ConfirmVariant, string> = {
  danger: 'rounded-2xl bg-brand-danger px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50',
  primary: 'ui-primary-button',
  secondary: 'ui-secondary-button',
  success: 'rounded-2xl bg-brand-success px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50',
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Скасувати',
  confirmVariant = 'primary',
  loading = false,
  disabled = false,
  icon,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = description ? `${titleId}-description` : undefined

  return (
    <DialogShell open={open} labelledBy={titleId} describedBy={descriptionId} onClose={onCancel}>
      <DialogHeader
        title={title}
        description={description}
        titleId={titleId}
        descriptionId={descriptionId}
        actions={icon}
      />
      {children ? <DialogBody>{children}</DialogBody> : null}
      <DialogFooter className="sm:justify-end">
        <button type="button" className="ui-secondary-button" disabled={loading} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className={confirmClassName[confirmVariant]} disabled={disabled || loading} onClick={onConfirm}>
          {loading ? 'Зачекайте…' : confirmLabel}
        </button>
      </DialogFooter>
    </DialogShell>
  )
}
