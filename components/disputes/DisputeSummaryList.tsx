import Link from 'next/link'
import DisputeStatusBadge from './DisputeStatusBadge'
import {
  getDisputePriorityLabel,
  getDisputeReasonLabel,
  type DisputeSummary,
} from '@/types/disputes'

export default function DisputeSummaryList({
  disputes,
  detailBasePath,
}: {
  disputes: DisputeSummary[]
  detailBasePath: string
}) {
  return (
    <div className="space-y-4">
      {disputes.map((dispute) => (
        <Link
          key={dispute.id}
          href={`${detailBasePath}/${dispute.id}`}
          className="ui-elevated-panel block p-5 transition-colors hover:bg-panel/40 sm:p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold text-copy-strong">
                  Суперечка #{dispute.id.slice(0, 8)}
                </h2>
                <DisputeStatusBadge status={dispute.status} />
              </div>
              <p className="text-sm text-copy-secondary">
                {getDisputeReasonLabel(dispute.reason)} · {getDisputePriorityLabel(dispute.priority)}
              </p>
              <p className="text-sm text-copy-muted">
                {dispute.productName ?? 'Замовлення'} · {dispute.storeName ?? 'Marketplace order'}
              </p>
              <p className="line-clamp-2 text-sm text-copy-primary">{dispute.description}</p>
            </div>

            <div className="space-y-1 text-sm text-copy-secondary lg:text-right">
              <p>Замовлення #{dispute.orderId.slice(0, 8)}</p>
              <p>{new Date(dispute.createdAt).toLocaleDateString('uk-UA')}</p>
              <p>{dispute.paymentStatus ?? 'Статус оплати уточнюється'}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
