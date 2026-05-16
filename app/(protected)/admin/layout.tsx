import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import AdminDashboardShell from '@/components/admin/AdminDashboardShell'
import { ROLE_VALUES, hasRole } from '@/lib/constants/roles'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminLayoutData } from '@/app/(protected)/admin/_lib/admin-dashboard.data'

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
          description="This workspace is reserved for marketplace administrators managing moderation, analytics, and operational oversight."
          actionHref="/profile"
          actionLabel="Go to account"
        />
      </main>
    )
  }

  const { adminProfile } = await getAdminLayoutData(user)

  if (!adminProfile) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <ProtectedRouteState
          title="Admin profile not ready"
          description="Your admin role is active, but the admin profile record has not been initialized yet."
          actionHref="/profile"
          actionLabel="Go to account"
        />
      </main>
    )
  }

  return (
    <AdminDashboardShell user={user} adminProfile={adminProfile}>
      {children}
    </AdminDashboardShell>
  )
}
