'use client'

import { useRouter } from 'next/navigation'

export default function RefreshPageButton({ label = 'Refresh' }: { label?: string }) {
  const router = useRouter()

  return (
    <button type="button" className="ui-secondary-button" onClick={() => router.refresh()}>
      {label}
    </button>
  )
}

