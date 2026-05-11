'use client'

import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import AuthInputField from '@/components/auth/AuthInputField'

export default function AuthPasswordField({
  error,
  autoComplete = 'current-password',
}: {
  error?: string
  autoComplete?: string
}) {
  const [isVisible, setIsVisible] = useState(false)
  const id = useId()

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-sm font-medium text-copy-strong">
          Password
        </label>
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm text-copy-muted transition-colors hover:text-copy-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          aria-pressed={isVisible}
          aria-controls={id}
          onClick={() => setIsVisible((current) => !current)}
        >
          {isVisible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          <span>{isVisible ? 'Hide' : 'Show'}</span>
        </button>
      </div>

      <AuthInputField
        id={id}
        name="password"
        autoComplete={autoComplete}
        type={isVisible ? 'text' : 'password'}
        error={error}
        hint="At least 8 characters."
        required
      />
    </div>
  )
}
