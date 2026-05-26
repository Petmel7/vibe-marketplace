import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CheckoutShell from '@/components/checkout/CheckoutShell'
import CheckoutSuccessCard from '@/components/checkout/CheckoutSuccessCard'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import { getCurrentUser } from '@/lib/session/getSession'
import { OrderAccessError, OrderNotFoundError } from '@/lib/errors/orders'
import { getMyOrderById } from '@/features/orders/orders.service'

export const metadata: Metadata = {
  title: 'Order success — Вайб',
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

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const { orderId } = await params
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

  return (
    <CheckoutShell>
      <CheckoutSuccessCard order={state.order} />
    </CheckoutShell>
  )
}
