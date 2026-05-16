import { redirect } from 'next/navigation'
import SellerProductForm from '@/components/seller/SellerProductForm'
import SellerSection from '@/components/seller/SellerSection'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerStorePageData } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerNewProductPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerStorePageData(user)

  if (!data.sellerProfile) {
    redirect('/seller/store?setup=profile')
  }

  if (!data.store) {
    redirect('/seller/store?setup=store')
  }

  return (
    <SellerSection
      eyebrow="New product"
      title="Create product draft"
      description="Prepare a moderation-ready product draft with variants, media placeholders, and inventory metadata."
    >
      <SellerVerificationNotice
        status={data.sellerProfile.verificationStatus}
      />
      <SellerProductForm mode="create" />
    </SellerSection>
  )
}
