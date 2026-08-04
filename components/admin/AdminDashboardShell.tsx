import type { ReactNode } from 'react'
import type { SessionUser } from '@/types/auth'
import AdminSidebar from '@/components/admin/AdminSidebar'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function AdminDashboardShell({
  user,
  adminProfile,
  children,
}: {
  user: SessionUser
  adminProfile: {
    permissions: string[]
  }
  children: ReactNode
}) {
  return (
    <DashboardLayout sidebar={<AdminSidebar user={user} adminProfile={adminProfile} />}>
      {children}
    </DashboardLayout>
  )
}
