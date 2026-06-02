'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SessionUser } from '@/types/auth'
import type { UserProfileDto } from '@/features/profile/profile.dto'
import { ROLE_VALUES, hasRole } from '@/lib/constants/roles'

const NAV_ITEMS = [
  { href: '/profile', label: 'Overview' },
  { href: '/profile/orders', label: 'Orders' },
  { href: '/profile/reports', label: 'Reports' },
  { href: '/profile/addresses', label: 'Addresses' },
  { href: '/profile/wishlist', label: 'Wishlist' },
  { href: '/profile/settings', label: 'Settings' },
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
    <aside className="space-y-4 lg:sticky lg:top-6">
      <section className="ui-elevated-panel p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Buyer dashboard</p>
        <h2 className="mt-3 text-xl font-semibold text-copy-strong">{displayName}</h2>
        <p className="mt-1 break-all text-sm text-copy-muted">{user.email}</p>
      </section>

      <nav aria-label="Profile navigation" className="ui-elevated-panel p-3">
        <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
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
        <h3 className="text-base font-semibold text-copy-strong">
          {sellerEnabled ? 'Seller workspace' : 'Become a seller'}
        </h3>
        <p className="mt-2 text-sm text-copy-muted">
          {sellerEnabled
            ? 'Your account is already ready for seller tools and storefront management.'
            : 'Upgrade from buyer to seller with a dedicated onboarding flow, verification awareness, and a future-ready storefront setup path.'}
        </p>
        <Link href={sellerEnabled ? '/seller' : '/seller/onboarding'} className="ui-secondary-button mt-4 w-full">
          {sellerEnabled ? 'Open seller area' : 'Start selling'}
        </Link>
      </section>
    </aside>
  )
}
