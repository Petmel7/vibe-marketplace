'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SessionUser } from '@/types/auth'
import type { SellerVerificationStatus } from '@/types/seller'
import VerificationStatusBadge from '@/components/seller/VerificationStatusBadge'

const NAV_ITEMS = [
  { href: '/seller', label: 'Overview' },
  { href: '/seller/products', label: 'Products' },
  { href: '/seller/orders', label: 'Orders' },
  { href: '/seller/promotions', label: 'Promotions' },
  { href: '/seller/finance', label: 'Finance' },
  { href: '/seller/refunds', label: 'Refunds' },
  { href: '/seller/disputes', label: 'Disputes' },
  { href: '/seller/reviews', label: 'Reviews' },
  { href: '/seller/inventory', label: 'Inventory' },
  { href: '/seller/analytics', label: 'Analytics' },
  { href: '/seller/store', label: 'Store' },
] as const

export default function SellerSidebar({
  user,
  sellerProfile,
  store,
}: {
  user: SessionUser
  sellerProfile: {
    businessName: string | null
    verificationStatus: string
  } | null
  store: {
    name: string
    slug: string
    isActive: boolean
  } | null
}) {
  const pathname = usePathname()
  const displayName = sellerProfile?.businessName || store?.name || user.email
  const verificationStatus = sellerProfile?.verificationStatus as SellerVerificationStatus | undefined

  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      <section className="ui-elevated-panel p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Seller workspace</p>
        <h2 className="mt-3 text-xl font-semibold text-copy-strong">{displayName}</h2>
        <p className="mt-1 break-all text-sm text-copy-muted">{user.email}</p>
        {verificationStatus ? (
          <div className="mt-4">
            <VerificationStatusBadge status={verificationStatus} />
          </div>
        ) : null}
      </section>

      <nav aria-label="Seller navigation" className="ui-elevated-panel p-3">
        <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/seller' && pathname?.startsWith(`${item.href}/`))
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
        <h3 className="text-base font-semibold text-copy-strong">Store readiness</h3>
        <p className="mt-2 text-sm text-copy-muted">
          {store
            ? `Your storefront is connected at /${store.slug} and ${store.isActive ? 'currently active' : 'currently paused'}.`
            : 'Your seller verification is complete, but storefront provisioning still needs to be finished before product, order, and inventory workflows can open.'}
        </p>
        <Link href="/seller/store" className="ui-secondary-button mt-4 w-full">
          Open store settings
        </Link>
      </section>
    </aside>
  )
}
