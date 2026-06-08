'use client'

import { useAdminOperations } from '@/hooks/useAdminOperations'

export default function RunDueJobsButton({ limit = 10 }: { limit?: number }) {
  const { runDueJobs, isPending } = useAdminOperations()

  return (
    <button
      type="button"
      className="ui-primary-button disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isPending}
      onClick={() => void runDueJobs(limit)}
    >
      {isPending ? 'Running…' : 'Run due jobs'}
    </button>
  )
}

