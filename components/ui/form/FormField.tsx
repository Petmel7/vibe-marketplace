import type { ReactNode } from 'react'
import clsx from 'clsx'
import FormError from './FormError'

export default function FormField({
  label,
  htmlFor,
  helperText,
  helperId,
  error,
  errorId,
  children,
  className,
}: {
  label?: ReactNode
  htmlFor?: string
  helperText?: ReactNode
  helperId?: string
  error?: ReactNode
  errorId?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('ui-form-field-stack', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="ui-form-label">
          {label}
        </label>
      ) : null}
      {helperText ? <span id={helperId} className="ui-form-helper">{helperText}</span> : null}
      {children}
      <FormError id={errorId}>{error}</FormError>
    </div>
  )
}
