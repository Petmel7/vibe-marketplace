'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { refundsApi } from '@/components/refunds/api/refunds.api'
import type { CreateRefundRequestInput, RefundRequestReason } from '@/types/refunds'

const INITIAL_REASON: RefundRequestReason = 'ITEM_NOT_AS_DESCRIBED'

type UseRefundRequestOptions = {
  orderId: string
  orderItemId: string
  initialAmount?: string
  onSuccess?: (refundId: string) => void
}

export function useRefundRequest({
  orderId,
  orderItemId,
  initialAmount = '',
  onSuccess,
}: UseRefundRequestOptions) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState<RefundRequestReason>(INITIAL_REASON)
  const [amount, setAmount] = useState(initialAmount)
  const [description, setDescription] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  function reset() {
    setReason(INITIAL_REASON)
    setAmount(initialAmount)
    setDescription('')
    setErrorMessage(null)
  }

  function open() {
    reset()
    setIsOpen(true)
  }

  function close() {
    if (isPending) {
      return
    }

    setIsOpen(false)
    reset()
  }

  async function submit() {
    if (isPending) {
      return
    }

    const trimmedDescription = description.trim()
    const normalizedAmount = amount.trim()

    if (!normalizedAmount) {
      setErrorMessage('Вкажіть суму повернення.')
      return
    }

    if (!/^\d+(\.\d{1,2})?$/.test(normalizedAmount)) {
      setErrorMessage('Сума має бути вказана у форматі 0.00.')
      return
    }

    if (Number(normalizedAmount) <= 0) {
      setErrorMessage('Сума повернення має бути більшою за нуль.')
      return
    }

    if (reason === 'OTHER' && !trimmedDescription) {
      setErrorMessage('Додайте опис причини повернення.')
      return
    }

    setIsPending(true)
    setErrorMessage(null)

    try {
      const payload: CreateRefundRequestInput = {
        orderId,
        orderItemId,
        amount: normalizedAmount,
        reason,
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
      }

      const refund = await refundsApi.create(payload)
      setIsOpen(false)
      reset()
      router.refresh()
      onSuccess?.(refund.id)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Не вдалося створити запит на повернення. Спробуйте ще раз.',
      )
    } finally {
      setIsPending(false)
    }
  }

  return {
    isOpen,
    isPending,
    reason,
    amount,
    description,
    errorMessage,
    open,
    close,
    submit,
    setReason,
    setAmount,
    setDescription,
  }
}
