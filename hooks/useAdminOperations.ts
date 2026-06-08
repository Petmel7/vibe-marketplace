'use client'

import { useAdminMutation } from '@/hooks/useAdminMutation'
import {
  API_ROUTES,
  getAdminOperationsJobCancelRoute,
  getAdminOperationsJobRetryRoute,
} from '@/lib/constants/apiRoutes'
import type { AdminOperationsRunDueResponse } from '@/types/operations'

export function useAdminOperations() {
  const mutation = useAdminMutation()

  return {
    ...mutation,
    retryJob: (jobId: string) =>
      mutation.execute({
        url: getAdminOperationsJobRetryRoute(jobId),
        method: 'POST',
        successMessage: 'Job queued for retry.',
        fallbackErrorMessage: 'Не вдалося повторити job. Спробуйте ще раз.',
      }),
    cancelJob: (jobId: string) =>
      mutation.execute({
        url: getAdminOperationsJobCancelRoute(jobId),
        method: 'POST',
        successMessage: 'Pending job cancelled.',
        fallbackErrorMessage: 'Не вдалося скасувати job. Спробуйте ще раз.',
      }),
    runDueJobs: (limit = 10) =>
      mutation.execute<AdminOperationsRunDueResponse>({
        url: API_ROUTES.adminOperationsJobsRunDue,
        method: 'POST',
        body: { limit },
        successMessage: 'Due jobs were processed.',
        fallbackErrorMessage: 'Не вдалося запустити due jobs. Спробуйте ще раз.',
      }),
  }
}

