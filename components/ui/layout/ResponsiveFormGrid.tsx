import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function ResponsiveFormGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('ui-responsive-form-grid', className)}>
      {children}
    </div>
  )
}
