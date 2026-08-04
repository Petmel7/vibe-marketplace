import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function ResponsiveActionGroup({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('ui-responsive-action-group', className)}>
      {children}
    </div>
  )
}
