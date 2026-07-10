import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session/getSession'
import DashboardShell from '@/components/profile/DashboardShell'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import { ROLE_VALUES, hasRole } from '@/lib/constants/roles'
import { getProfileDashboardLayoutData } from '@/app/(protected)/profile/_lib/profile-dashboard.data'

export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?notice=auth-required&next=/profile')
  }

  if (!hasRole(user.roles, ROLE_VALUES.BUYER)) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <ProtectedRouteState
          title="Потрібен доступ покупця"
          description="Цей кабінет призначений для сценаріїв покупця: замовлень, адрес та обраного."
          actionHref="/"
          actionLabel="На головну"
        />
      </main>
    )
  }

  const { profile } = await getProfileDashboardLayoutData(user)

  return (
    <DashboardShell user={user} profile={profile}>
      {children}
    </DashboardShell>
  )
}
