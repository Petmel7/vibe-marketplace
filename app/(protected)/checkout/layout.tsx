import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session/getSession'
import { ROLE_VALUES, hasRole } from '@/lib/constants/roles'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'

export default async function CheckoutLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?notice=auth-required&next=/checkout')
  }

  if (!hasRole(user.roles, ROLE_VALUES.BUYER)) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <ProtectedRouteState
          title="Потрібен доступ покупця"
          description="Оформлення замовлення доступне лише для автентифікованих акаунтів покупця."
          actionHref="/"
          actionLabel="На головну"
        />
      </main>
    )
  }

  return children
}
