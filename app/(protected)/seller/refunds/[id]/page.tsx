import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import RefundDetailCard from '@/components/refunds/RefundDetailCard'
import RefundTimeline from '@/components/refunds/RefundTimeline'
import SectionStack from '@/components/layout/SectionStack'
import TwoColumnLayout from '@/components/layout/TwoColumnLayout'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'
import { getSellerRefundDetailViewState } from '@/app/(protected)/seller/_lib/seller-refunds.data'

export default async function SellerRefundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const { id } = await params
  const state = await getSellerRefundDetailViewState(user, id)
  const onboardingRedirect = getSellerWorkspaceRedirect(state.layout)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  if (state.kind === 'not-found') {
    notFound()
  }

  if (state.kind === 'forbidden') {
    return (
      <ProtectedRouteState
        title="Немає доступу до повернення"
        description="Цей refund request не пов’язаний із товарами вашого магазину."
        actionHref="/seller/refunds"
        actionLabel="Назад до повернень"
      />
    )
  }

  const sellerProfile = state.layout.sellerProfile!
  const { refund } = state

  return (
    <SellerSection
      eyebrow="Refund details"
      title={`Повернення #${refund.id.slice(0, 8)}`}
      description="Переглядайте buyer context, суму повернення та поточний стан без доступу до admin-only нотаток."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />

      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/seller/orders`} className="ui-link-muted">
          Замовлення продавця
        </Link>
        <Link href="/seller/refunds" className="ui-link-muted">
          Назад до повернень
        </Link>
      </div>

      <TwoColumnLayout variant="detailAside">
        <SectionStack>
          <RefundDetailCard refund={refund} title="Контекст повернення" />
          <SellerTable
            title="Що це означає для продавця"
            description="Seller view read-only: рішення та фінальний refund outcome контролюються адміністрацією маркетплейсу."
          >
            <div className="space-y-3 p-5 sm:p-6 text-sm leading-6 text-copy-secondary">
              <p>Слідкуйте за зміною статусу, щоб розуміти, чи запит уже підтверджений, відхилений або обробляється.</p>
              <p>Якщо повернення завершиться успішно, seller finance та ledger будуть оновлені на backend.</p>
            </div>
          </SellerTable>
        </SectionStack>

        <SectionStack>
          <RefundTimeline refund={refund} />
        </SectionStack>
      </TwoColumnLayout>
    </SellerSection>
  )
}
