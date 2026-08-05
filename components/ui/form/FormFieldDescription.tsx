import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function FormFieldDescription({
  children,
  id,
  className,
}: {
  children?: ReactNode
  id?: string
  className?: string
}) {
  if (!children) {
    return null
  }

  return (
    <span id={id} className={clsx('ui-form-helper', className)}>
      {children}
    </span>
  )
}
