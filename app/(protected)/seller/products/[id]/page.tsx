import { notFound, redirect } from 'next/navigation'
import SellerProductForm from '@/components/seller/SellerProductForm'
import SellerSection from '@/components/seller/SellerSection'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerProductEditorData, getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const { id } = await params
  const data = await getSellerProductEditorData(user, id)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!

  if (!data.product) {
    notFound()
  }

  return (
    <SellerSection
      eyebrow="Product editor"
      title={data.product.name}
      description="Update listing details, moderation readiness, and variant-level product structure."
    >
      <SellerVerificationNotice
        status={sellerProfile.verificationStatus}
      />
      <SellerProductForm mode="edit" storeSlug={data.store?.slug ?? ''} initialProduct={data.product} />
    </SellerSection>
  )
}
