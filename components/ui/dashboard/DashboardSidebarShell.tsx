import type { ReactNode } from 'react'

export default function DashboardSidebarShell({ children }: { children: ReactNode }) {
  return <aside className="min-w-0 space-y-4 lg:sticky lg:top-6">{children}</aside>
}
