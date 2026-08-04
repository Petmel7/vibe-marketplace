import type { CSSProperties, ReactNode } from 'react'
import clsx from 'clsx'

type DashboardLayoutProps = {
  sidebar: ReactNode
  children: ReactNode
  sidebarWidth?: string
  className?: string
  contentClassName?: string
}

export default function DashboardLayout({
  sidebar,
  children,
  sidebarWidth = '300px',
  className,
  contentClassName,
}: DashboardLayoutProps) {
  const gridStyle = {
    '--dashboard-sidebar-width': sidebarWidth,
  } as CSSProperties

  return (
    <main className={clsx('ui-section-spacing', className)}>
      <div
        className="grid gap-6 lg:grid-cols-[var(--dashboard-sidebar-width)_minmax(0,1fr)] lg:items-start"
        style={gridStyle}
      >
        {sidebar}
        <div className={clsx('min-w-0 space-y-6', contentClassName)}>{children}</div>
      </div>
    </main>
  )
}
