import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import SellerInventoryManager from '@/components/seller/SellerInventoryManager'
import SellerSection from '@/components/seller/SellerSection'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerInventoryPageData } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerInventoryPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerInventoryPageData(user)

  if (!data.sellerProfile) {
    redirect('/seller/store?setup=profile')
  }

  if (!data.store) {
    redirect('/seller/store?setup=store')
  }

  return (
    <SellerSection
      eyebrow="Inventory"
      title="Inventory controls"
      description="Update per-variant stock levels, review low-stock risks, and keep SKU availability current."
    >
      <SellerVerificationNotice
        status={data.sellerProfile.verificationStatus}
      />

      {data.products.length === 0 ? (
        <EmptyState
          title="No inventory yet"
          description="Create your first product and variant set to unlock seller inventory controls."
          actionHref="/seller/products/new"
          actionLabel="Create product"
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
          isReadOnly={data.sellerProfile.verificationStatus === 'SUSPENDED'}
        />
      )}
    </SellerSection>
  )
}
