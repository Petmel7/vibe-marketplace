'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SessionUser } from '@/types/auth'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge'

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/moderation', label: 'Moderation' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/sellers', label: 'Sellers' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/disputes', label: 'Disputes' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/emails', label: 'Emails' },
  { href: '/admin/settings/badges', label: 'Badge rules' },
] as const

export default function AdminSidebar({
  user,
  adminProfile,
}: {
  user: SessionUser
  adminProfile: {
    permissions: string[]
  }
}) {
  const pathname = usePathname()

  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      <section className="ui-elevated-panel p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Admin workspace</p>
        <h2 className="mt-3 text-xl font-semibold text-copy-strong">{user.email}</h2>
        <p className="mt-1 text-sm text-copy-muted">Marketplace governance and operational oversight</p>
        <div className="mt-4">
          <AdminStatusBadge label="Administrator" tone="info" />
        </div>
      </section>

      <nav aria-label="Admin navigation" className="ui-elevated-panel p-3">
        <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname?.startsWith(`${item.href}/`))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
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

      <section className="ui-panel p-5">
        <h3 className="text-base font-semibold text-copy-strong">Admin permissions</h3>
        <p className="mt-2 text-sm text-copy-muted">
          {adminProfile.permissions.length
            ? adminProfile.permissions.join(', ')
            : 'No explicit permission scopes are attached to this admin profile yet.'}
        </p>
      </section>
    </aside>
  )
}
