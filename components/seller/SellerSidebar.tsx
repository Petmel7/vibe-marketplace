'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SessionUser } from '@/types/auth'
import type { SellerVerificationStatus } from '@/types/seller'
import VerificationStatusBadge from '@/components/seller/VerificationStatusBadge'
import {
  DashboardSidebarIdentity,
  DashboardSidebarNav,
  DashboardSidebarPanel,
  DashboardSidebarShell,
} from '@/components/ui/dashboard'

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
    <DashboardSidebarShell>
      <DashboardSidebarIdentity
        eyebrow="Кабінет продавця"
        title={displayName}
        subtitle={user.email}
        subtitleTitle={user.email}
      >
        {verificationStatus ? (
          <div className="mt-4">
            <VerificationStatusBadge status={verificationStatus} />
          </div>
        ) : null}
      </DashboardSidebarIdentity>

      <DashboardSidebarNav
        ariaLabel="Навігація продавця"
        items={NAV_ITEMS}
        isActive={(item) =>
          pathname === item.href || (item.href !== '/seller' && pathname?.startsWith(`${item.href}/`))
        }
      />

      <DashboardSidebarPanel>
        <h3 className="text-base font-semibold text-copy-strong">Готовність магазину</h3>
        <p className="mt-2 text-sm text-copy-muted">
          {store
            ? `Вашу вітрину підключено за адресою /${store.slug}, і вона зараз ${store.isActive ? 'активна' : 'призупинена'}.`
            : 'Вашу верифікацію продавця завершено, але підключення вітрини ще потрібно завершити, перш ніж стануть доступними товари, замовлення та складські процеси.'}
        </p>
        <div className="mt-4 min-[501px]:max-[1025px]:flex min-[501px]:max-[1025px]:justify-center">
          <Link href="/seller/store" className="ui-secondary-button w-fit max-[500px]:w-full">
            Відкрити налаштування магазину
          </Link>
        </div>
      </DashboardSidebarPanel>
    </DashboardSidebarShell>
  )
}
