import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function TableHead({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <thead className={clsx('bg-panel/60 text-left text-copy-muted', className)}>
      {children}
    </thead>
  )
}
