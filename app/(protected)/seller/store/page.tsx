import { redirect } from 'next/navigation'
import SellerSection from '@/components/seller/SellerSection'
import SellerStoreSettingsForm from '@/components/seller/SellerStoreSettingsForm'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import SellerShippingSettingsForm from '@/components/shipping/SellerShippingSettingsForm'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerStorePageData, getSellerStorefrontRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerStorePage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const { setup } = await searchParams
  const data = await getSellerStorePageData(user)
  const onboardingRedirect = getSellerStorefrontRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  return (
    <SellerSection
      eyebrow="Store"
      title="Store settings"
      description="Manage onboarding progress, storefront identity, verification messaging, and activation readiness."
    >
      <SellerVerificationNotice
        status={data.sellerProfile?.verificationStatus}
      />

      <SellerStoreSettingsForm
        sellerProfile={
          data.sellerProfile
            ? {
              businessName: data.sellerProfile.businessName,
              taxId: data.sellerProfile.taxId,
              verificationStatus: data.sellerProfile.verificationStatus,
            }
            : null
        }
        store={data.store}
        setupHint={setup}
      />

      {data.store ? <SellerShippingSettingsForm /> : null}
    </SellerSection>
  )
}
