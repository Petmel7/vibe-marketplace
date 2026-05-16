import type { ReactNode } from 'react'
import type { SessionUser } from '@/types/auth'
import SellerSidebar from '@/components/seller/SellerSidebar'

export default function SellerDashboardShell({
  user,
  sellerProfile,
  store,
  children,
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
  children: ReactNode
}) {
  return (
    <main className="ui-section-spacing">
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
        <SellerSidebar user={user} sellerProfile={sellerProfile} store={store} />
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </main>
  )
}
