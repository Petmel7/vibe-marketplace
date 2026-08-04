import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function FormActions({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex flex-wrap gap-2', className)}>
      {children}
    </div>
  )
}
