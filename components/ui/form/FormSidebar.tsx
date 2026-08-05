import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function FormSidebar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <aside className={clsx('space-y-4 lg:sticky lg:top-6 lg:self-start', className)}>
      {children}
    </aside>
  )
}
