import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function TableEmptyState({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('p-6', className)}>
      {children}
    </div>
  )
}
