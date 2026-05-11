import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session/getSession'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import { ROLE_VALUES, hasRole } from '@/lib/constants/roles'

export default async function SellerLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?notice=auth-required&next=/seller')
  }

  if (!hasRole(user.roles, ROLE_VALUES.SELLER)) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <ProtectedRouteState
          title="Seller access required"
          description="This area is reserved for marketplace sellers. Once your seller role is assigned, the workspace will open here automatically."
          actionHref="/profile"
          actionLabel="Go to account"
        />
      </main>
    )
  }

  return children
}
