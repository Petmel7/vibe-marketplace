import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import SellerInventoryManager from '@/components/seller/SellerInventoryManager'
import SellerSection from '@/components/seller/SellerSection'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerInventoryPageData, getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerInventoryPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerInventoryPageData(user)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!

  return (
    <SellerSection
      eyebrow="Склад"
      title="Керування складом"
      description="Оновлюйте залишки для кожного варіанта, контролюйте ризики низького запасу та підтримуйте актуальну наявність SKU."
    >
      <SellerVerificationNotice
        status={sellerProfile.verificationStatus}
      />

      {data.products.length === 0 ? (
        <EmptyState
          title="Склад ще порожній"
          description="Створіть свій перший товар і набір варіантів, щоб відкрити керування складом продавця."
          actionHref="/seller/products/new"
          actionLabel="Створити товар"
        />
      ) : (
        <SellerInventoryManager
          initialProducts={data.products.map((product) => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            status: product.status,
            variants: product.variants.map((variant) => ({
              id: variant.id,
              sku: variant.sku,
              size: variant.size,
              color: variant.color,
              stock: variant.stock,
            })),
          }))}
          isReadOnly={sellerProfile.verificationStatus === 'SUSPENDED'}
        />
      )}
    </SellerSection>
  )
}
