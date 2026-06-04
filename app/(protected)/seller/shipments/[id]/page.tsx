import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import SellerSection from '@/components/seller/SellerSection'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import SellerShipmentDetail from '@/components/shipping/SellerShipmentDetail'
import { getCurrentUser } from '@/lib/session/getSession'
import {
  getSellerShipmentDetailPageData,
} from '@/app/(protected)/seller/_lib/seller-shipments.data'
import { getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const { id } = await params
  const data = await getSellerShipmentDetailPageData(user, id)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  if (data.accessState === 'forbidden') {
    return (
      <ProtectedRouteState
        title="Доступ до відправлення заборонено"
        description="Це відправлення не належить до вашого магазину."
        actionHref="/seller/shipments"
        actionLabel="Повернутися до відправлень"
      />
    )
  }

  if (data.accessState === 'not-found' || !data.shipment) {
    notFound()
  }

  return (
    <SellerSection
      eyebrow="Shipments"
      title={`Відправлення #${data.shipment.id.slice(0, 8)}`}
      description="Створюйте ТТН Nova Poshta, перевіряйте recipient snapshot і синхронізуйте актуальний статус доставки."
    >
      <SellerVerificationNotice status={data.sellerProfile?.verificationStatus} />
      <Link href="/seller/shipments" className="ui-link-muted">
        Назад до всіх відправлень
      </Link>
      <SellerShipmentDetail shipment={data.shipment} shippingSettings={data.shippingSettings} />
    </SellerSection>
  )
}
