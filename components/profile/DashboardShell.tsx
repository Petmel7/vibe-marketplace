import type { ReactNode } from 'react'
import type { SessionUser } from '@/types/auth'
import type { UserProfileDto } from '@/features/profile/profile.dto'
import DashboardSidebar from '@/components/profile/DashboardSidebar'
import DashboardLayout from '@/components/layout/DashboardLayout'

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
    <DashboardLayout sidebar={<DashboardSidebar user={user} profile={profile} />} sidebarWidth="280px">
      {children}
    </DashboardLayout>
  )
}
