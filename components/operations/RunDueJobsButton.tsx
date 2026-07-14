'use client'

import { useAdminOperations } from '@/hooks/useAdminOperations'

export default function RunDueJobsButton({ limit = 10 }: { limit?: number }) {
  const { runDueJobs, isPending } = useAdminOperations()

  return (
    <button
      type="button"
      className="ui-primary-button text-center max-[460px]:w-full max-[460px]:min-h-12 max-[460px]:px-5 max-[460px]:text-sm max-[460px]:leading-5 max-[460px]:whitespace-normal disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isPending}
      onClick={() => void runDueJobs(limit)}
    >
      {isPending ? 'Запускаємо…' : 'Запустити заплановані задачі'}
    </button>
  )
}
