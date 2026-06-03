import Link from 'next/link'
import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import SellerPromotionTable from '@/components/promotions/SellerPromotionTable'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import {
  getSellerPromotionsPageData,
} from '@/app/(protected)/seller/_lib/seller-promotions.data'
import { getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerPromotionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerPromotionsPageData(user, await searchParams)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!

  return (
    <SellerSection
      eyebrow="Promotions"
      title="Seller coupons"
      description="Create and manage store-scoped promotions while keeping checkout totals fully authoritative on the backend."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />

      <div className="flex flex-col gap-4 rounded-2xl border border-panelBorder bg-panel/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-copy-strong">Promotion overview</h2>
          <p className="text-sm text-copy-muted">
            Seller coupons can target your whole store, selected products, or selected categories.
          </p>
        </div>
        <Link href="/seller/promotions/new" className="ui-primary-button">
          New promotion
        </Link>
      </div>

      <SellerTable
        title="Your promotions"
        description="Status, discount windows, and usage snapshots for promotions attached to your storefront."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No seller promotions yet"
              description="Create your first store coupon to test scoped discounts in checkout."
              actionHref="/seller/promotions/new"
              actionLabel="Create promotion"
            />
          </div>
        ) : (
          <SellerPromotionTable items={data.items} />
        )}
      </SellerTable>
    </SellerSection>
  )
}
