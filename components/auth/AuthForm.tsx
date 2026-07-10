'use client'

import { useActionState, useEffect, useRef } from 'react'
import type { AuthActionState } from '@/features/auth/auth-form.schema'
import AuthPasswordField from '@/components/auth/AuthPasswordField'
import AuthSubmitButton from '@/components/auth/AuthSubmitButton'

const initialState: AuthActionState = {}

type Props = {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>
  submitLabel: string
  pendingLabel: string
  next?: string
  emailAutoComplete?: string
  passwordAutoComplete?: string
  intro?: string
}

export default function AuthForm({
  action,
  submitLabel,
  pendingLabel,
  next,
  emailAutoComplete = 'email',
  passwordAutoComplete = 'current-password',
  intro,
}: Props) {
  const [state, formAction] = useActionState(action, initialState)
  const emailRef = useRef<HTMLInputElement>(null)
  const formErrorRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (state.fieldErrors?.email) {
      emailRef.current?.focus()
      return
    }

    if (state.formError) {
      formErrorRef.current?.focus()
    }
  }, [state])

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {intro ? <p className="ui-body-secondary">{intro}</p> : null}
      <input type="hidden" name="next" value={next ?? ''} />

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-copy-strong">
          Електронна пошта
        </label>
        <input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          autoComplete={emailAutoComplete}
          placeholder="name@example.com"
          aria-invalid={state.fieldErrors?.email ? 'true' : 'false'}
          aria-describedby={state.fieldErrors?.email ? 'email-error' : undefined}
          className="ui-surface-input"
          required
        />
        {state.fieldErrors?.email?.[0] ? (
          <p id="email-error" className="text-sm text-brand-danger" role="alert">
            {state.fieldErrors.email[0]}
          </p>
        ) : null}
      </div>

      <AuthPasswordField
        error={state.fieldErrors?.password?.[0]}
        autoComplete={passwordAutoComplete}
      />

      {state.formError ? (
        <p
          ref={formErrorRef}
          tabIndex={-1}
          className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-strong focus:outline-none"
          role="alert"
        >
          {state.formError}
        </p>
      ) : null}

      <AuthSubmitButton idleLabel={submitLabel} pendingLabel={pendingLabel} />
    </form>
  )
}
