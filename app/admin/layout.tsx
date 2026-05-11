import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session/getSession'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import { ROLE_VALUES, hasRole } from '@/lib/constants/roles'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?notice=auth-required&next=/admin')
  }

  if (!hasRole(user.roles, ROLE_VALUES.ADMIN)) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <ProtectedRouteState
          title="Admin access required"
          description="This route is reserved for administrators. The UI is ready to host moderation and oversight modules once your role is available."
          actionHref="/profile"
          actionLabel="Go to account"
        />
      </main>
    )
  }

  return children
}
