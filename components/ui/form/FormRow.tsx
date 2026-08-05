import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function FormRow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex items-center justify-between gap-4', className)}>
      {children}
    </div>
  )
}
