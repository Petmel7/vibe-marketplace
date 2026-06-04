'use client'

import { useId, useState } from 'react'

export default function TrackingNumberCopyButton({
  trackingNumber,
}: {
  trackingNumber: string
}) {
  const [message, setMessage] = useState<string | null>(null)
  const statusId = useId()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackingNumber)
      setMessage('Трек-номер скопійовано')
      window.setTimeout(() => setMessage(null), 2500)
    } catch {
      setMessage('Не вдалося скопіювати трек-номер')
      window.setTimeout(() => setMessage(null), 2500)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="ui-secondary-button h-9 px-3 py-2 text-sm"
        onClick={handleCopy}
        aria-describedby={statusId}
      >
        Скопіювати ТТН
      </button>
      <span id={statusId} className="sr-only" aria-live="polite">
        {message ?? ''}
      </span>
      {message ? <span className="text-xs text-copy-muted">{message}</span> : null}
    </div>
  )
}
