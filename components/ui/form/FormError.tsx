import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function FormError({
  id,
  children,
  className,
}: {
  id?: string
  children?: ReactNode
  className?: string
}) {
  if (!children) {
    return null
  }

  return (
    <p id={id} className={clsx('text-sm text-brand-danger', className)} role="alert">
      {children}
    </p>
  )
}
