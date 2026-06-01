import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CheckoutPendingStatusClient from '@/components/checkout/CheckoutPendingStatusClient'
import CheckoutShell from '@/components/checkout/CheckoutShell'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import { getMyOrderById } from '@/features/orders/orders.service'
import { OrderAccessError, OrderNotFoundError } from '@/lib/errors/orders'
import { getCurrentUser } from '@/lib/session/getSession'
import { isPaymentNextAction, type PaymentNextAction } from '@/types/payments'
import { toCheckoutOrderDetail } from '@/types/orders'

export const metadata: Metadata = {
  title: 'Очікування оплати — Вайб',
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

function parseNextAction(value: string | string[] | undefined): PaymentNextAction | null {
  return typeof value === 'string' && isPaymentNextAction(value) ? value : null
}

export default async function CheckoutPendingPage({
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
  const state = await getCheckoutPendingState(user, orderId)

  if (state.kind === 'not-found') {
    notFound()
  }

  if (state.kind === 'forbidden') {
    return (
      <CheckoutShell
        title="Очікування оплати"
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

  return (
    <CheckoutShell
      title="Очікуємо підтвердження платежу"
      description="Ми стежимо за серверним статусом платежу і автоматично оновимо сторінку, щойно LiqPay webhook підтвердить або відхилить оплату."
      currentLabel="Оплата в очікуванні"
    >
      <CheckoutPendingStatusClient
        initialOrder={toCheckoutOrderDetail(state.order)}
        nextAction={parseNextAction(resolvedSearchParams.nextAction)}
      />
    </CheckoutShell>
  )
}
