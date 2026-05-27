'use client'

import { useRouter } from 'next/navigation'
import { useAdminMutation } from '@/hooks/useAdminMutation'
import { getAdminEmailRetryRoute } from '@/lib/constants/apiRoutes'
import type { AdminEmailEventDetail, AdminEmailEventStatus } from '@/types/admin-emails'

function canRetry(status: AdminEmailEventStatus, attempts: number, maxAttempts: number) {
  if (status === 'PROCESSING' || status === 'CANCELLED') {
    return false
  }

  return status !== 'SENT' && attempts < maxAttempts
}

export default function EmailRetryButton({
  eventId,
  status,
  attempts,
  maxAttempts,
  onRetried,
}: {
  eventId: string
  status: AdminEmailEventStatus
  attempts: number
  maxAttempts: number
  onRetried?: (event: AdminEmailEventDetail) => void | Promise<void>
}) {
  const router = useRouter()
  const { execute, isPending } = useAdminMutation()
  const disabled = !canRetry(status, attempts, maxAttempts) || isPending

  return (
    <button
      type="button"
      className="ui-secondary-button"
      disabled={disabled}
      aria-label="Retry email event"
      onClick={async () => {
        const data = await execute<AdminEmailEventDetail>({
          url: getAdminEmailRetryRoute(eventId),
          method: 'POST',
          successMessage: 'Email retry started.',
          fallbackErrorMessage:
            'We could not retry this transactional email right now. Please try again.',
          onSuccess: async (updatedEvent) => {
            await onRetried?.(updatedEvent)
          },
        })

        if (data) {
          router.refresh()
        }
      }}
    >
      {isPending ? 'Retrying...' : 'Retry email'}
    </button>
  )
}
