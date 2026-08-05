'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SessionUser } from '@/types/auth'
import type { UserProfileDto } from '@/features/profile/profile.dto'
import { ROLE_VALUES, hasRole } from '@/lib/constants/roles'
import {
  DashboardSidebarIdentity,
  DashboardSidebarNav,
  DashboardSidebarPanel,
  DashboardSidebarShell,
} from '@/components/ui/dashboard'

const NAV_ITEMS = [
  { href: '/profile', label: 'Огляд' },
  { href: '/profile/orders', label: 'Замовлення' },
  { href: '/profile/refunds', label: 'Повернення' },
  { href: '/profile/disputes', label: 'Суперечки' },
  { href: '/profile/reports', label: 'Скарги' },
  { href: '/profile/addresses', label: 'Адреси' },
  { href: '/profile/wishlist', label: 'Обране' },
  { href: '/profile/settings', label: 'Налаштування' },
] as const

export default function DashboardSidebar({
  user,
  profile,
}: {
  user: SessionUser
  profile: UserProfileDto | null
}) {
  const pathname = usePathname()
  const displayName = profile?.displayName || user.email
  const sellerEnabled = hasRole(user.roles, ROLE_VALUES.SELLER)

  return (
    <DashboardSidebarShell>
      <DashboardSidebarIdentity
        eyebrow="Кабінет покупця"
        title={displayName}
        subtitle={user.email}
        subtitleTitle={user.email}
      />

      <DashboardSidebarNav
        ariaLabel="Навігація профілю"
        items={NAV_ITEMS}
        isActive={(item) => pathname === item.href}
      />

      <DashboardSidebarPanel>
        <h3 className="text-base font-semibold text-copy-strong">
          {sellerEnabled ? 'Кабінет продавця' : 'Стати продавцем'}
        </h3>
        <p className="mt-2 text-sm text-copy-muted">
          {sellerEnabled
            ? 'Ваш акаунт уже готовий до інструментів продавця та керування вітриною магазину.'
            : 'Перейдіть від покупця до продавця через окремий онбординг, верифікацію та майбутнє налаштування вітрини.'}
        </p>
        <div className="mt-4 flex min-[501px]:justify-center min-[1026px]:justify-start">
          <Link
            href={sellerEnabled ? '/seller' : '/seller/onboarding'}
            className="ui-secondary-button w-fit max-[499px]:w-full"
          >
            {sellerEnabled ? 'Відкрити кабінет продавця' : 'Почати продавати'}
          </Link>
        </div>
      </DashboardSidebarPanel>
    </DashboardSidebarShell>
  )
}
