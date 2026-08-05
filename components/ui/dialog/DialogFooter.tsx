import type { ReactNode } from 'react'
import clsx from 'clsx'
import DialogActions from './DialogActions'

export default function DialogFooter({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <DialogActions className={clsx('mt-6', className)}>
      {children}
    </DialogActions>
  )
}
