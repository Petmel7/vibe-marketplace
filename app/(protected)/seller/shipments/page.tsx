import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import SellerShipmentTable from '@/components/shipping/SellerShipmentTable'
import { getCurrentUser } from '@/lib/session/getSession'
import {
  getSellerShipmentsPageData,
} from '@/app/(protected)/seller/_lib/seller-shipments.data'
import { getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerShipmentsPageData(user, await searchParams)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!

  return (
    <SellerSection
      eyebrow="Відправлення"
      title="Відправлення Nova Poshta"
      description="Створюйте ТТН, відстежуйте статуси доставки та контролюйте виконання замовлень без дублювання checkout-логіки."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />

      <SellerTable
        title="Черга відправлень"
        description="Окреме відправлення формується для кожного магазину в мультивендорному замовленні."
      >
        {data.shipments.items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Відправлень поки що немає"
              description="Щойно покупці оформлять замовлення з Nova Poshta, тут з’являться відправлення для створення ТТН та відстеження."
              actionHref="/seller/orders"
              actionLabel="Перейти до замовлень"
            />
          </div>
        ) : (
          <SellerShipmentTable
            shipments={data.shipments}
            isShippingConfigured={Boolean(data.shippingSettings?.isConfigured)}
          />
        )}
      </SellerTable>
    </SellerSection>
  )
}
