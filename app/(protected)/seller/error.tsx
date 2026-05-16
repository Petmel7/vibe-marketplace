'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="rounded-2xl border border-dashed border-panelBorder bg-panel/60 px-6 py-10 text-center">
      <h2 className="text-lg font-semibold text-copy-strong">We could not load this seller section</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-copy-muted">
        Try again to refresh the seller workspace. If the issue continues, the store or session data may need attention.
      </p>
      <button type="button" className="ui-secondary-button mt-5" onClick={unstable_retry}>
        Try again
      </button>
    </div>
  )
}
