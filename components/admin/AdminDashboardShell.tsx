import type { ReactNode } from 'react'
import type { SessionUser } from '@/types/auth'
import AdminSidebar from '@/components/admin/AdminSidebar'

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
    <main className="ui-section-spacing">
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
        <AdminSidebar user={user} adminProfile={adminProfile} />
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </main>
  )
}
