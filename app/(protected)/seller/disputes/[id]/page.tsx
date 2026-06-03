import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import DisputeStatusBadge from '@/components/disputes/DisputeStatusBadge'
import DisputeTimeline from '@/components/disputes/DisputeTimeline'
import DisputeMessageList from '@/components/disputes/DisputeMessageList'
import DisputeMessageComposer from '@/components/disputes/DisputeMessageComposer'
import DisputeEvidenceViewer from '@/components/disputes/DisputeEvidenceViewer'
import DisputeEvidenceUploadPanel from '@/components/disputes/DisputeEvidenceUploadPanel'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getDisputePriorityLabel, getDisputeReasonLabel } from '@/types/disputes'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'
import { getSellerDisputeDetailViewState } from '@/app/(protected)/seller/_lib/seller-disputes.data'

export default async function SellerDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const { id } = await params
  const state = await getSellerDisputeDetailViewState(user, id)
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
        title="Немає доступу до суперечки"
        description="Ця суперечка не стосується ваших товарів або магазину."
        actionHref="/seller/disputes"
        actionLabel="Назад до суперечок"
      />
    )
  }

  const { dispute } = state
  const sellerProfile = state.layout.sellerProfile!

  return (
    <SellerSection
      eyebrow="Dispute details"
      title={`Суперечка #${dispute.id.slice(0, 8)}`}
      description="Відповідайте покупцю, діліться доказами та стежте за рішенням модерації."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />

      <div className="flex flex-wrap items-center gap-3">
        <DisputeStatusBadge status={dispute.status} />
        <p className="text-sm text-copy-muted">
          {getDisputeReasonLabel(dispute.reason)} · {getDisputePriorityLabel(dispute.priority)}
        </p>
        <Link href="/seller/disputes" className="ui-link-muted">
          Назад до суперечок
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_360px]">
        <div className="space-y-6">
          <SellerTable
            title="Контекст суперечки"
            description={`${dispute.productName ?? 'Замовлення'} · ${dispute.storeName ?? `Order #${dispute.orderId.slice(0, 8)}`}`}
          >
            <div className="space-y-4 p-5 sm:p-6">
              <p className="text-sm leading-6 text-copy-primary">{dispute.description}</p>
              <DisputeTimeline dispute={dispute} />
            </div>
          </SellerTable>

          <SellerTable
            title="Листування"
            description="Відповідайте покупцю або адміністрації прямо в суперечці."
          >
            <div className="space-y-5 p-5 sm:p-6">
              <DisputeMessageList messages={dispute.messages} currentUserId={user.id} />
              <DisputeMessageComposer disputeId={dispute.id} submitLabel="Надіслати відповідь" />
            </div>
          </SellerTable>
        </div>

        <div className="space-y-6">
          <DisputeEvidenceViewer evidence={dispute.evidence} />
          <DisputeEvidenceUploadPanel disputeId={dispute.id} existingCount={dispute.evidence.length} />
        </div>
      </div>
    </SellerSection>
  )
}
