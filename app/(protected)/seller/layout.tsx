import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import SellerDashboardShell from '@/components/seller/SellerDashboardShell'
import { ROLE_VALUES, hasRole } from '@/lib/constants/roles'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerLayoutData } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()
  const pathname = (await headers()).get('x-pathname') ?? '/seller'

  if (!user) {
    redirect('/login?notice=auth-required&next=/seller')
  }

  if (pathname.startsWith('/seller/onboarding')) {
    return children
  }

  if (!hasRole(user.roles, ROLE_VALUES.SELLER)) {
    redirect('/seller/onboarding')
  }

  const { sellerProfile, store } = await getSellerLayoutData(user)

  return (
    <SellerDashboardShell user={user} sellerProfile={sellerProfile} store={store}>
      {children}
    </SellerDashboardShell>
  )
}
