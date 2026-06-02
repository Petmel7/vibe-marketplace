'use client'

import { useMemo, useState, useTransition } from 'react'
import { abuseReportsApi } from '@/components/abuse-reports/api/abuse-reports.api'
import type {
  AbuseReportReason,
  AbuseReportTargetType,
  CreateReportInput,
} from '@/types/abuse-reports'

type UseReportDialogOptions = {
  targetType: AbuseReportTargetType
  targetId: string
  onSuccess?: () => void
}

const INITIAL_REASON: AbuseReportReason = 'SPAM'

export function useReportDialog({ targetType, targetId, onSuccess }: UseReportDialogOptions) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState<AbuseReportReason>(INITIAL_REASON)
  const [description, setDescription] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isDescriptionRequired = reason === 'OTHER'

  const descriptionError = useMemo(() => {
    if (!isDescriptionRequired) {
      return null
    }

    return description.trim().length >= 10
      ? null
      : 'Опишіть проблему детальніше, якщо обираєте іншу причину.'
  }, [description, isDescriptionRequired])

  function reset() {
    setReason(INITIAL_REASON)
    setDescription('')
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  function open() {
    reset()
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
    reset()
  }

  function submit() {
    if (isPending) {
      return
    }

    if (descriptionError) {
      setErrorMessage(descriptionError)
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)

    startTransition(async () => {
      try {
        const payload: CreateReportInput = {
          targetType,
          targetId,
          reason,
          ...(description.trim() ? { description: description.trim() } : {}),
        }

        await abuseReportsApi.create(payload)
        setSuccessMessage('Скаргу надіслано. Команда безпеки вже отримала звернення.')
        onSuccess?.()
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Не вдалося надіслати скаргу. Спробуйте ще раз.',
        )
      }
    })
  }

  return {
    isOpen,
    isPending,
    reason,
    description,
    errorMessage,
    successMessage,
    isDescriptionRequired,
    open,
    close,
    submit,
    setReason,
    setDescription,
  }
}
