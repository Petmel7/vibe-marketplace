import type { ReactNode } from 'react'
import type { SessionUser } from '@/types/auth'
import SellerSidebar from '@/components/seller/SellerSidebar'
import DashboardLayout from '@/components/layout/DashboardLayout'

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
    <DashboardLayout sidebar={<SellerSidebar user={user} sellerProfile={sellerProfile} store={store} />}>
      {children}
    </DashboardLayout>
  )
}
