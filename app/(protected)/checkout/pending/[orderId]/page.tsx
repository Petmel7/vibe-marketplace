import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CheckoutPendingPaymentCard from '@/components/checkout/CheckoutPendingPaymentCard'
import CheckoutShell from '@/components/checkout/CheckoutShell'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import { getMyOrderById } from '@/features/orders/orders.service'
import { OrderAccessError, OrderNotFoundError } from '@/lib/errors/orders'
import { getCurrentUser } from '@/lib/session/getSession'
import {
  isPaymentMethod,
  isPaymentNextAction,
  isPaymentStatus,
} from '@/types/payments'

export const metadata: Metadata = {
  title: 'Payment pending — Вайб',
}

async function getCheckoutPendingState(
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

export default async function CheckoutPendingPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{
    paymentMethod?: string | string[]
    paymentStatus?: string | string[]
    nextAction?: string | string[]
  }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const { orderId } = await params
  const resolvedSearchParams = await searchParams
  const state = await getCheckoutPendingState(user, orderId)

  if (state.kind === 'not-found') {
    notFound()
  }

  if (state.kind === 'forbidden') {
    return (
      <CheckoutShell
        title="Оплата очікує підтвердження"
        description="Сторінка оплати доступна тільки для власника цього замовлення."
        currentLabel="Оплата в очікуванні"
      >
        <ProtectedRouteState
          title="Order access denied"
          description="This order is not available for the current buyer account."
          actionHref="/profile/orders"
          actionLabel="Back to orders"
        />
      </CheckoutShell>
    )
  }

  const paymentMethod =
    typeof resolvedSearchParams.paymentMethod === 'string' &&
    isPaymentMethod(resolvedSearchParams.paymentMethod)
      ? resolvedSearchParams.paymentMethod
      : null
  const paymentStatus =
    typeof resolvedSearchParams.paymentStatus === 'string' &&
    isPaymentStatus(resolvedSearchParams.paymentStatus)
      ? resolvedSearchParams.paymentStatus
      : null
  const nextAction =
    typeof resolvedSearchParams.nextAction === 'string' &&
    isPaymentNextAction(resolvedSearchParams.nextAction)
      ? resolvedSearchParams.nextAction
      : null

  return (
    <CheckoutShell
      title="Оплата очікує підтвердження"
      description="Ми створили замовлення, але фінальний статус оплати оновиться після підтвердження від сервера або платіжного провайдера."
      currentLabel="Оплата в очікуванні"
    >
      <CheckoutPendingPaymentCard
        order={state.order}
        paymentMethod={paymentMethod}
        paymentStatus={paymentStatus}
        nextAction={nextAction}
      />
    </CheckoutShell>
  )
}
