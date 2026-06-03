import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdminSection from '@/components/admin/AdminSection'
import DisputeStatusBadge from '@/components/disputes/DisputeStatusBadge'
import DisputeTimeline from '@/components/disputes/DisputeTimeline'
import DisputeMessageList from '@/components/disputes/DisputeMessageList'
import DisputeMessageComposer from '@/components/disputes/DisputeMessageComposer'
import DisputeEvidenceViewer from '@/components/disputes/DisputeEvidenceViewer'
import AdminDisputeActionPanel from '@/components/disputes/AdminDisputeActionPanel'
import { getDisputePriorityLabel, getDisputeReasonLabel } from '@/types/disputes'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminDisputeDetailPageData } from '@/app/(protected)/admin/_lib/admin-disputes.data'

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const { id } = await params
  const dispute = await getAdminDisputeDetailPageData(user, id)

  if (!dispute) {
    notFound()
  }

  return (
    <AdminSection
      eyebrow="Dispute details"
      title={`Dispute #${dispute.id.slice(0, 8)}`}
      description="Переглядайте матеріали суперечки, залишайте внутрішні нотатки та проводьте resolution flow."
    >
      <div className="flex flex-wrap items-center gap-3">
        <DisputeStatusBadge status={dispute.status} />
        <p className="text-sm text-copy-muted">
          {getDisputeReasonLabel(dispute.reason)} · {getDisputePriorityLabel(dispute.priority)}
        </p>
        <Link href="/admin/disputes" className="ui-link-muted">
          Back to disputes
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_360px]">
        <div className="space-y-6">
          <section className="ui-elevated-panel p-5 sm:p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-copy-strong">Контекст суперечки</h2>
                <p className="mt-1 text-sm text-copy-muted">
                  {dispute.productName ?? 'Order dispute'} · {dispute.storeName ?? `Order #${dispute.orderId.slice(0, 8)}`}
                </p>
              </div>
              <p className="text-sm leading-6 text-copy-primary">{dispute.description}</p>
              <DisputeTimeline dispute={dispute} />
            </div>
          </section>

          <section className="ui-elevated-panel p-5 sm:p-6">
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-copy-strong">Листування та нотатки</h2>
                <p className="mt-1 text-sm text-copy-muted">
                  Адміністратори бачать і публічні повідомлення, і внутрішні нотатки.
                </p>
              </div>
              <DisputeMessageList messages={dispute.messages} currentUserId={user.id} />
              <DisputeMessageComposer
                disputeId={dispute.id}
                allowInternalNotes
                submitLabel="Додати повідомлення або нотатку"
              />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <DisputeEvidenceViewer evidence={dispute.evidence} />
          <AdminDisputeActionPanel dispute={dispute} />
        </div>
      </div>
    </AdminSection>
  )
}
