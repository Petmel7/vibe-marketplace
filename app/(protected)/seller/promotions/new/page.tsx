import { redirect } from 'next/navigation'
import SellerPromotionForm from '@/components/promotions/SellerPromotionForm'
import SellerSection from '@/components/seller/SellerSection'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'
import { getSellerPromotionEditorData } from '@/app/(protected)/seller/_lib/seller-promotions.data'

export default async function SellerNewPromotionPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerPromotionEditorData(user)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!

  if (!data.promotionStore) {
    redirect('/seller/store?setup=storefront')
  }

  return (
    <SellerSection
      eyebrow="Нова акція"
      title="Створити акцію продавця"
      description="Створіть купон для магазину, а бекенд перевірить право власності, область застосування та доступність у checkout."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />
      <SellerPromotionForm
        mode="create"
        store={data.promotionStore}
        products={data.promotionProducts}
        categories={data.promotionCategories}
      />
    </SellerSection>
  )
}
