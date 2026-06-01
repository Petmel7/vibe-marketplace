import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CheckoutFailureCard from '@/components/checkout/CheckoutFailureCard'
import CheckoutPendingStatusClient from '@/components/checkout/CheckoutPendingStatusClient'
import CheckoutShell from '@/components/checkout/CheckoutShell'
import CheckoutSuccessCard from '@/components/checkout/CheckoutSuccessCard'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import { getCurrentUser } from '@/lib/session/getSession'
import { OrderAccessError, OrderNotFoundError } from '@/lib/errors/orders'
import { getMyOrderById } from '@/features/orders/orders.service'
import { isPaymentNextAction, type PaymentNextAction } from '@/types/payments'
import {
  isFailedPaymentStatus,
  isPaidOrderStatus,
  isSuccessfulPaymentStatus,
  toCheckoutOrderDetail,
} from '@/types/orders'

export const metadata: Metadata = {
  title: 'Статус замовлення — Вайб',
}

async function getCheckoutSuccessState(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  orderId: string,
) {
  try {
    const order = await getMyOrderById(user, orderId)
    return { kind: 'success' as const, order }
  } catch (error) {
    if (error instanceof OrderNotFoundError) {
      return { kind: 'not-found' as const }
    }

    if (error instanceof OrderAccessError) {
      return { kind: 'forbidden' as const }
    }

    throw error
  }
}

function parseNextAction(value: string | string[] | undefined): PaymentNextAction | null {
  return typeof value === 'string' && isPaymentNextAction(value) ? value : null
}

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{
    nextAction?: string | string[]
  }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const { orderId } = await params
  const resolvedSearchParams = await searchParams
  const state = await getCheckoutSuccessState(user, orderId)

  if (state.kind === 'not-found') {
    notFound()
  }

  if (state.kind === 'forbidden') {
    return (
      <CheckoutShell>
        <ProtectedRouteState
          title="Order access denied"
          description="This order is not available for the current buyer account."
          actionHref="/profile/orders"
          actionLabel="Back to orders"
        />
      </CheckoutShell>
    )
  }

  const order = toCheckoutOrderDetail(state.order)
  const nextAction = parseNextAction(resolvedSearchParams.nextAction)
  const isCashOnDelivery = order.paymentMethod === 'CASH_ON_DELIVERY'
  const isSuccessful =
    isCashOnDelivery ||
    isSuccessfulPaymentStatus(order.paymentStatus) ||
    isPaidOrderStatus(order.status)
  const isFailed = isFailedPaymentStatus(order.paymentStatus)

  return (
    <CheckoutShell
      title={isSuccessful ? 'Замовлення оформлено' : 'Статус замовлення'}
      description={
        isSuccessful
          ? 'Ми показуємо тільки серверно-підтверджений статус замовлення та оплати.'
          : 'Статус замовлення ще може змінюватися після підтвердження платежу або завершення обробки.'
      }
      currentLabel={isSuccessful ? 'Успішне оформлення' : 'Статус платежу'}
    >
      {isFailed ? (
        <CheckoutFailureCard order={order} />
      ) : isSuccessful ? (
        <CheckoutSuccessCard order={order} nextAction={nextAction} />
      ) : (
        <CheckoutPendingStatusClient initialOrder={order} nextAction={nextAction} />
      )}
    </CheckoutShell>
  )
}
