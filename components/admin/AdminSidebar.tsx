'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SessionUser } from '@/types/auth'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge'

const NAV_ITEMS = [
  { href: '/admin', label: 'Огляд' },
  { href: '/admin/moderation', label: 'Модерація' },
  { href: '/admin/products', label: 'Товари' },
  { href: '/admin/categories', label: 'Категорії' },
  { href: '/admin/sellers', label: 'Продавці' },
  { href: '/admin/users', label: 'Користувачі' },
  { href: '/admin/orders', label: 'Замовлення' },
  { href: '/admin/shipments', label: 'Відправлення' },
  { href: '/admin/promotions', label: 'Акції' },
  { href: '/admin/commission-rules', label: 'Правила комісій' },
  { href: '/admin/payouts', label: 'Виплати' },
  { href: '/admin/refunds', label: 'Повернення' },
  { href: '/admin/seller-balances', label: 'Баланси продавців' },
  { href: '/admin/disputes', label: 'Суперечки' },
  { href: '/admin/reviews', label: 'Відгуки' },
  { href: '/admin/reports', label: 'Скарги' },
  { href: '/admin/risk', label: 'Ризики' },
  { href: '/admin/analytics', label: 'Аналітика' },
  { href: '/admin/operations', label: 'Операції' },
  { href: '/admin/emails', label: 'Листи' },
  { href: '/admin/settings/badges', label: 'Правила бейджів' },
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
        <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Кабінет адміністратора</p>
        <h2 className="mt-3 text-xl font-semibold text-copy-strong">{user.email}</h2>
        <p className="mt-1 text-sm text-copy-muted">Керування маркетплейсом та операційний контроль</p>
        <div className="mt-4">
          <AdminStatusBadge label="Адміністратор" tone="info" />
        </div>
      </section>

      <nav aria-label="Навігація адміністратора" className="ui-elevated-panel p-3">
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
        <h3 className="text-base font-semibold text-copy-strong">Права адміністратора</h3>
        <p className="mt-2 text-sm text-copy-muted">
          {adminProfile.permissions.length
            ? adminProfile.permissions.join(', ')
            : 'До цього профілю адміністратора ще не прив’язано явних областей дозволів.'}
        </p>
      </section>
    </aside>
  )
}
