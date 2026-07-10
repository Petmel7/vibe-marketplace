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
      aria-label="Повторити email-подію"
      onClick={async () => {
        const data = await execute<AdminEmailEventDetail>({
          url: getAdminEmailRetryRoute(eventId),
          method: 'POST',
          successMessage: 'Повторну спробу email-запущено.',
          fallbackErrorMessage:
            'Зараз не вдалося повторити цей транзакційний лист. Спробуйте ще раз.',
          onSuccess: async (updatedEvent) => {
            await onRetried?.(updatedEvent)
          },
        })

        if (data) {
          router.refresh()
        }
      }}
    >
      {isPending ? 'Повторюємо...' : 'Повторити email'}
    </button>
  )
}
