import type { ReactNode } from 'react'
import clsx from 'clsx'
import FormError from './FormError'

export default function FormField({
  label,
  htmlFor,
  helperText,
  error,
  errorId,
  children,
  className,
}: {
  label?: ReactNode
  htmlFor?: string
  helperText?: ReactNode
  error?: ReactNode
  errorId?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('space-y-2', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-copy-strong">
          {label}
        </label>
      ) : null}
      {helperText ? <span className="block text-sm text-copy-muted">{helperText}</span> : null}
      {children}
      <FormError id={errorId}>{error}</FormError>
    </div>
  )
}
