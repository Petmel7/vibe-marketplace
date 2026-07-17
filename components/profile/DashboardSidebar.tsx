'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SessionUser } from '@/types/auth'
import type { UserProfileDto } from '@/features/profile/profile.dto'
import { ROLE_VALUES, hasRole } from '@/lib/constants/roles'

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
    <aside className="min-w-0 space-y-4 lg:sticky lg:top-6">
      <section className="ui-elevated-panel p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Кабінет покупця</p>
        <h2 className="mt-3 truncate text-xl font-semibold text-copy-strong" title={displayName}>
          {displayName}
        </h2>
        <p className="mt-1 truncate text-sm text-copy-muted" title={user.email}>
          {user.email}
        </p>
      </section>

      <nav aria-label="Навігація профілю" className="ui-elevated-panel max-w-full p-3">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:overflow-visible">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium transition-colors lg:whitespace-normal ${
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
      </section>
    </aside>
  )
}
