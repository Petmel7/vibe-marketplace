'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="rounded-2xl border border-dashed border-panelBorder bg-panel/60 px-6 py-10 text-center">
      <h2 className="text-lg font-semibold text-copy-strong">We could not load this dashboard section</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-copy-muted">
        Please try again. If the problem continues, the session or account data may need to be refreshed.
      </p>
      <button type="button" className="ui-secondary-button mt-5" onClick={reset}>
        Try again
      </button>
    </div>
  )
}
