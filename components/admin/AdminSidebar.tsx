'use client'

import { usePathname } from 'next/navigation'
import type { SessionUser } from '@/types/auth'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import {
  DashboardSidebarIdentity,
  DashboardSidebarNav,
  DashboardSidebarPanel,
  DashboardSidebarShell,
} from '@/components/ui/dashboard'

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
  { href: '/admin/hero-banners', label: 'Hero-банери' },
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
    <DashboardSidebarShell>
      <DashboardSidebarIdentity
        eyebrow="Кабінет адміністратора"
        title={user.email}
        subtitle="Керування маркетплейсом та операційний контроль"
        truncateSubtitle={false}
      >
        <div className="mt-4">
          <AdminStatusBadge label="Адміністратор" tone="info" />
        </div>
      </DashboardSidebarIdentity>

      <DashboardSidebarNav
        ariaLabel="Навігація адміністратора"
        items={NAV_ITEMS}
        isActive={(item) =>
          pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(`${item.href}/`))
        }
      />

      <DashboardSidebarPanel>
        <h3 className="text-base font-semibold text-copy-strong">Права адміністратора</h3>
        <p className="mt-2 text-sm text-copy-muted">
          {adminProfile.permissions.length
            ? adminProfile.permissions.join(', ')
            : 'До цього профілю адміністратора ще не прив’язано явних областей дозволів.'}
        </p>
      </DashboardSidebarPanel>
    </DashboardSidebarShell>
  )
}
