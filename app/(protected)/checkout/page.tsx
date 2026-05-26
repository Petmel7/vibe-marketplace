import type { Metadata } from 'next'
import CheckoutClient from '@/components/checkout/CheckoutClient'
import CheckoutShell from '@/components/checkout/CheckoutShell'

export const metadata: Metadata = {
  title: 'Checkout — Вайб',
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cartId?: string | string[] }>
}) {
  const resolvedSearchParams = await searchParams
  const cartId =
    typeof resolvedSearchParams.cartId === 'string' ? resolvedSearchParams.cartId : undefined

  return (
    <CheckoutShell>
      <CheckoutClient initialCartId={cartId} />
    </CheckoutShell>
  )
}
