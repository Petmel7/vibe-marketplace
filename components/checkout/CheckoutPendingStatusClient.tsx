'use client'

import type { PaymentNextAction } from '@/types/payments'
import type { CheckoutOrderDetail } from '@/types/orders'
import { useCheckoutOrderPolling } from '@/hooks/useCheckoutOrderPolling'
import CheckoutFailureCard from './CheckoutFailureCard'
import CheckoutPendingPaymentCard from './CheckoutPendingPaymentCard'

export default function CheckoutPendingStatusClient({
  initialOrder,
  nextAction,
}: {
  initialOrder: CheckoutOrderDetail
  nextAction: PaymentNextAction | null
}) {
  const { order, isFailure, isPolling, isTimedOut, pollCount, lastError } =
    useCheckoutOrderPolling(initialOrder, initialOrder.paymentMethod === 'CARD')

  if (isFailure) {
    return <CheckoutFailureCard order={order} />
  }

  return (
    <CheckoutPendingPaymentCard
      order={order}
      nextAction={nextAction}
      isPolling={isPolling}
      isTimedOut={isTimedOut}
      pollCount={pollCount}
      pollingError={lastError}
    />
  )
}
