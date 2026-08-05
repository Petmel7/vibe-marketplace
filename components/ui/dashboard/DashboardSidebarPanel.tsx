import type { ReactNode } from 'react'

export default function DashboardSidebarPanel({ children }: { children: ReactNode }) {
  return <section className="ui-panel p-5">{children}</section>
}
