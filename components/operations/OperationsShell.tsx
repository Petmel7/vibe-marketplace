import Link from 'next/link'
import type { ReactNode } from 'react'

const NAV_ITEMS = [
  { href: '/admin/operations', label: 'Overview' },
  { href: '/admin/operations/health', label: 'Health' },
  { href: '/admin/operations/jobs', label: 'Jobs' },
  { href: '/admin/operations/audit-logs', label: 'Audit logs' },
] as const

export default function OperationsShell({
  currentPath,
  children,
}: {
  currentPath: string
  children: ReactNode
}) {
  return (
    <div className="space-y-5">
      <nav aria-label="Operations navigation" className="ui-elevated-panel p-3">
        <div className="flex flex-wrap gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              currentPath === item.href || (item.href !== '/admin/operations' && currentPath.startsWith(`${item.href}/`))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand text-white'
                    : 'bg-panel text-copy-secondary hover:bg-panelAlt hover:text-copy-strong'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
      {children}
    </div>
  )
}

