import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function FormFieldLabel({
  children,
  htmlFor,
  className,
}: {
  children: ReactNode
  htmlFor?: string
  className?: string
}) {
  return (
    <label htmlFor={htmlFor} className={clsx('ui-form-label', className)}>
      {children}
    </label>
  )
}
