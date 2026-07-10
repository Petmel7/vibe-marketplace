import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import AdminDashboardShell from '@/components/admin/AdminDashboardShell'
import { ROLE_VALUES, hasRole } from '@/lib/constants/roles'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminLayoutData } from '@/app/(protected)/admin/_lib/admin-dashboard.data'
import { logInfo } from '@/utils/logger'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  logInfo('admin-layout:start', {
    domain: 'admin',
    route: '/admin',
  })
  const user = await getCurrentUser()
  logInfo('admin-layout:after-get-current-user', {
    domain: 'admin',
    route: '/admin',
    hasUser: Boolean(user),
    userId: user?.id ?? null,
  })

  if (!user) {
    redirect('/login?notice=auth-required&next=/admin')
  }

  if (!hasRole(user.roles, ROLE_VALUES.ADMIN)) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <ProtectedRouteState
          title="Потрібен доступ адміністратора"
          description="Цей робочий простір призначений для адміністраторів маркетплейсу, які керують модерацією, аналітикою та операційним контролем."
          actionHref="/profile"
          actionLabel="Перейти до акаунта"
        />
      </main>
    )
  }

  logInfo('admin-layout:before-layout-data', {
    domain: 'admin',
    route: '/admin',
    userId: user.id,
  })
  const { adminProfile } = await getAdminLayoutData(user)
  logInfo('admin-layout:after-layout-data', {
    domain: 'admin',
    route: '/admin',
    userId: user.id,
    hasAdminProfile: Boolean(adminProfile),
  })

  if (!adminProfile) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <ProtectedRouteState
          title="Профіль адміністратора ще не готовий"
          description="Ваша роль адміністратора вже активна, але запис профілю адміністратора ще не ініціалізовано."
          actionHref="/profile"
          actionLabel="Перейти до акаунта"
        />
      </main>
    )
  }

  logInfo('admin-layout:before-return', {
    domain: 'admin',
    route: '/admin',
    userId: user.id,
    permissionCount: adminProfile.permissions.length,
  })

  return (
    <AdminDashboardShell user={user} adminProfile={adminProfile}>
      {children}
    </AdminDashboardShell>
  )
}
