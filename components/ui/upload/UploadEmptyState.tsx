import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function UploadEmptyState({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span className={clsx('px-4 text-center text-sm text-copy-muted', className)}>
      {children}
    </span>
  )
}
