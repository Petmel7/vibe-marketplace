'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SessionUser } from '@/types/auth'
import type { SellerVerificationStatus } from '@/types/seller'
import VerificationStatusBadge from '@/components/seller/VerificationStatusBadge'

const NAV_ITEMS = [
  { href: '/seller', label: 'Огляд' },
  { href: '/seller/products', label: 'Товари' },
  { href: '/seller/orders', label: 'Замовлення' },
  { href: '/seller/shipments', label: 'Відправлення' },
  { href: '/seller/promotions', label: 'Акції' },
  { href: '/seller/finance', label: 'Фінанси' },
  { href: '/seller/refunds', label: 'Повернення' },
  { href: '/seller/disputes', label: 'Суперечки' },
  { href: '/seller/reviews', label: 'Відгуки' },
  { href: '/seller/inventory', label: 'Склад' },
  { href: '/seller/analytics', label: 'Аналітика' },
  { href: '/seller/store', label: 'Магазин' },
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
    <aside className="min-w-0 space-y-4 lg:sticky lg:top-6">
      <section className="ui-elevated-panel p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Кабінет продавця</p>
        <h2 className="mt-3 truncate text-xl font-semibold text-copy-strong" title={displayName}>
          {displayName}
        </h2>
        <p className="mt-1 truncate text-sm text-copy-muted" title={user.email}>
          {user.email}
        </p>
        {verificationStatus ? (
          <div className="mt-4">
            <VerificationStatusBadge status={verificationStatus} />
          </div>
        ) : null}
      </section>

      <nav aria-label="Навігація продавця" className="ui-elevated-panel max-w-full p-3">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:overflow-visible">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/seller' && pathname?.startsWith(`${item.href}/`))
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
        <h3 className="text-base font-semibold text-copy-strong">Готовність магазину</h3>
        <p className="mt-2 text-sm text-copy-muted">
          {store
            ? `Вашу вітрину підключено за адресою /${store.slug}, і вона зараз ${store.isActive ? 'активна' : 'призупинена'}.`
            : 'Вашу верифікацію продавця завершено, але підключення вітрини ще потрібно завершити, перш ніж стануть доступними товари, замовлення та складські процеси.'}
        </p>
        <Link href="/seller/store" className="ui-secondary-button mt-4 w-fit max-[502px]:w-full">
          Відкрити налаштування магазину
        </Link>
      </section>
    </aside>
  )
}
