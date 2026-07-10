import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import ProfileSection from '@/components/profile/ProfileSection'
import DashboardCard from '@/components/profile/DashboardCard'
import DisputeStatusBadge from '@/components/disputes/DisputeStatusBadge'
import DisputeTimeline from '@/components/disputes/DisputeTimeline'
import DisputeMessageList from '@/components/disputes/DisputeMessageList'
import DisputeMessageComposer from '@/components/disputes/DisputeMessageComposer'
import DisputeEvidenceViewer from '@/components/disputes/DisputeEvidenceViewer'
import DisputeEvidenceUploadPanel from '@/components/disputes/DisputeEvidenceUploadPanel'
import { getDisputePriorityLabel, getDisputeReasonLabel } from '@/types/disputes'
import { getCurrentUser } from '@/lib/session/getSession'
import { getProfileDisputeDetailViewState } from '@/app/(protected)/profile/_lib/profile-disputes.data'

export default async function ProfileDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const { id } = await params
  const state = await getProfileDisputeDetailViewState(user, id)

  if (state.kind === 'not-found') {
    notFound()
  }

  if (state.kind === 'forbidden') {
    return (
      <ProtectedRouteState
        title="Немає доступу до суперечки"
        description="Ця суперечка недоступна для поточного покупця."
        actionHref="/profile/disputes"
        actionLabel="Назад до суперечок"
      />
    )
  }

  const { dispute } = state

  return (
    <ProfileSection
      eyebrow="Деталі суперечки"
      title={`Суперечка #${dispute.id.slice(0, 8)}`}
      description="Переглядайте статус, листування та матеріали по проблемному замовленню."
    >
      <div className="flex flex-wrap items-center gap-3">
        <DisputeStatusBadge status={dispute.status} />
        <p className="text-sm text-copy-muted">
          {getDisputeReasonLabel(dispute.reason)} · {getDisputePriorityLabel(dispute.priority)}
        </p>
        <Link href={`/profile/orders/${dispute.orderId}`} className="ui-link-muted">
          Відкрити замовлення
        </Link>
        <Link href="/profile/disputes" className="ui-link-muted">
          Назад до суперечок
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_360px]">
        <div className="space-y-6">
          <DashboardCard
            title="Контекст суперечки"
            description={`Замовлення #${dispute.orderId.slice(0, 8)} · ${dispute.productName ?? 'Замовлення маркетплейсу'}`}
          >
            <div className="space-y-4 p-5 sm:p-6">
              <p className="text-sm leading-6 text-copy-primary">{dispute.description}</p>
              <DisputeTimeline dispute={dispute} />
            </div>
          </DashboardCard>

          <DashboardCard
            title="Листування"
            description="Уточнюйте деталі проблеми прямо в потоці суперечки."
          >
            <div className="space-y-5 p-5 sm:p-6">
              <DisputeMessageList messages={dispute.messages} currentUserId={user.id} />
              <DisputeMessageComposer disputeId={dispute.id} />
            </div>
          </DashboardCard>
        </div>

        <div className="space-y-6">
          <DisputeEvidenceViewer evidence={dispute.evidence} />
          <DisputeEvidenceUploadPanel disputeId={dispute.id} existingCount={dispute.evidence.length} />
        </div>
      </div>
    </ProfileSection>
  )
}
