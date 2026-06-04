import Link from 'next/link'
import RefundAmount from './RefundAmount'
import RefundStatusBadge from './RefundStatusBadge'
import type { RefundRequestSummary } from '@/types/refunds'
import { getRefundReasonLabel } from '@/types/refunds'

export default function RefundList({
  items,
  detailBasePath,
}: {
  items: RefundRequestSummary[]
  detailBasePath: string
}) {
  return (
    <div className="space-y-4">
      {items.map((refund) => (
        <Link
          key={refund.id}
          href={`${detailBasePath}/${refund.id}`}
          className="ui-elevated-panel block p-5 transition-colors hover:bg-panel/40 sm:p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold text-copy-strong">Повернення #{refund.id.slice(0, 8)}</h2>
                <RefundStatusBadge status={refund.status} />
              </div>
              <p className="text-sm text-copy-secondary">{getRefundReasonLabel(refund.reason)}</p>
              <p className="text-sm text-copy-muted">
                {refund.productName ?? 'Позиція замовлення'} · {refund.storeName ?? `Замовлення #${refund.orderId.slice(0, 8)}`}
              </p>
              {refund.description ? (
                <p className="line-clamp-2 text-sm text-copy-primary">{refund.description}</p>
              ) : null}
            </div>

            <div className="space-y-1 text-sm text-copy-secondary lg:text-right">
              <p>Замовлення #{refund.orderId.slice(0, 8)}</p>
              <p>{new Date(refund.createdAt).toLocaleDateString('uk-UA')}</p>
              <p>
                <RefundAmount amount={refund.amount} currency={refund.currency} emphasize />
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
