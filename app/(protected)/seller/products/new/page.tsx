import { redirect } from 'next/navigation'
import SellerProductForm from '@/components/seller/SellerProductForm'
import SellerSection from '@/components/seller/SellerSection'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerStorePageData, getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerNewProductPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerStorePageData(user)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!

  return (
    <SellerSection
      eyebrow="Новий товар"
      title="Створити чернетку товару"
      description="Підготуйте чернетку для модерації з варіантами, медіа-заглушками та даними про залишки."
    >
      <SellerVerificationNotice
        status={sellerProfile.verificationStatus}
      />
      <SellerProductForm mode="create" storeSlug={data.store?.slug ?? ''} />
    </SellerSection>
  )
}
