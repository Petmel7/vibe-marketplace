import type { ComponentPropsWithoutRef } from 'react'

type Props = ComponentPropsWithoutRef<'input'> & {
  id: string
  label?: string
  error?: string
  hint?: string
}

export default function AuthInputField({ id, label, error, hint, ...props }: Props) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={id} className="block text-sm font-medium text-copy-strong">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        className="ui-surface-input"
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-copy-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-brand-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
