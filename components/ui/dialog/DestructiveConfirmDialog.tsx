'use client'

import type { ConfirmDialogProps } from './ConfirmDialog'
import ConfirmDialog from './ConfirmDialog'

export default function DestructiveConfirmDialog({
  confirmLabel = 'Видалити',
  ...props
}: Omit<ConfirmDialogProps, 'confirmLabel' | 'confirmVariant'> & {
  confirmLabel?: string
}) {
  return <ConfirmDialog {...props} confirmLabel={confirmLabel} confirmVariant="danger" />
}
