import type { ReactNode } from 'react'
import type { SessionUser } from '@/types/auth'
import type { UserProfileDto } from '@/features/profile/profile.dto'
import DashboardSidebar from '@/components/profile/DashboardSidebar'

export default function DashboardShell({
  user,
  profile,
  children,
}: {
  user: SessionUser
  profile: UserProfileDto | null
  children: ReactNode
}) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <DashboardSidebar user={user} profile={profile} />
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </main>
  )
}
