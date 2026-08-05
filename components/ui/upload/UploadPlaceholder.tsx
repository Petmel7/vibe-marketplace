import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function UploadPlaceholder({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('rounded-3xl border border-dashed border-panelBorder bg-panel px-5 py-10 text-center text-sm text-copy-muted', className)}>
      {children}
    </div>
  )
}
