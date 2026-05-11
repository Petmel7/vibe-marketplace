'use client'

import { useFormStatus } from 'react-dom'

export default function AuthSubmitButton({
  idleLabel,
  pendingLabel,
}: {
  idleLabel: string
  pendingLabel: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      className="ui-primary-button w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  )
}
