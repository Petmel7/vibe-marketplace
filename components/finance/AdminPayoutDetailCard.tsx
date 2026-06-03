import MoneyAmount from './MoneyAmount'
import PayoutStatusBadge from './PayoutStatusBadge'
import PayoutActionDialog from './PayoutActionDialog'
import { getPayoutMethodLabel, type AdminPayoutDetail } from '@/types/payouts'

function canShowAction(currentStatus: AdminPayoutDetail['status'], nextStatus: AdminPayoutDetail['status']) {
  if (currentStatus === nextStatus) {
    return false
  }

  const transitions: Record<AdminPayoutDetail['status'], AdminPayoutDetail['status'][]> = {
    PENDING: ['PROCESSING', 'PAID', 'FAILED', 'CANCELLED'],
    PROCESSING: ['PAID', 'FAILED', 'CANCELLED'],
    PAID: [],
    FAILED: [],
    CANCELLED: [],
  }

  return transitions[currentStatus].includes(nextStatus)
}

export default function AdminPayoutDetailCard({ payout }: { payout: AdminPayoutDetail }) {
  const nextStatuses: AdminPayoutDetail['status'][] = ['PROCESSING', 'PAID', 'FAILED', 'CANCELLED']

  return (
    <div className="space-y-5">
      <section className="ui-elevated-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-copy-strong">Payout #{payout.id.slice(0, 8)}</h2>
              <PayoutStatusBadge status={payout.status} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Store</p>
                <p className="mt-1 font-medium text-copy-strong">{payout.storeName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Seller</p>
                <p className="mt-1 font-medium text-copy-strong">{payout.sellerName ?? payout.sellerEmail}</p>
                <p className="text-sm text-copy-muted">{payout.sellerEmail}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Amount</p>
                <p className="mt-1 font-medium text-copy-strong">
                  <MoneyAmount amount={payout.amount} currency={payout.currency} emphasize />
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Method</p>
                <p className="mt-1 font-medium text-copy-strong">{getPayoutMethodLabel(payout.method)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {nextStatuses
              .filter((status) => canShowAction(payout.status, status))
              .map((status) => (
                <PayoutActionDialog
                  key={status}
                  payoutId={payout.id}
                  nextStatus={status}
                  triggerLabel={status === 'PROCESSING' ? 'Позначити в обробці' : status === 'PAID' ? 'Позначити виплачено' : status === 'FAILED' ? 'Позначити помилку' : 'Скасувати payout'}
                />
              ))}
          </div>
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-copy-muted">Reference</dt>
            <dd className="mt-1 text-sm text-copy-strong">{payout.reference ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-copy-muted">Created</dt>
            <dd className="mt-1 text-sm text-copy-strong">{new Date(payout.createdAt).toLocaleString('uk-UA')}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-copy-muted">Paid at</dt>
            <dd className="mt-1 text-sm text-copy-strong">{payout.paidAt ? new Date(payout.paidAt).toLocaleString('uk-UA') : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-copy-muted">Failed at</dt>
            <dd className="mt-1 text-sm text-copy-strong">{payout.failedAt ? new Date(payout.failedAt).toLocaleString('uk-UA') : '—'}</dd>
          </div>
        </dl>

        {payout.adminNote ? (
          <div className="mt-5 rounded-2xl border border-panelBorder bg-panel p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Admin note</p>
            <p className="mt-2 text-sm text-copy-secondary">{payout.adminNote}</p>
          </div>
        ) : null}
      </section>

      <section className="ui-elevated-panel overflow-hidden">
        <header className="border-b border-panelBorder px-5 py-5 sm:px-6">
          <h3 className="text-lg font-semibold text-copy-strong">Included ledger entries</h3>
          <p className="mt-1 text-sm text-copy-muted">
            This payout includes immutable ledger entry references selected during payout creation.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-panel/60 text-left text-copy-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Ledger entry</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {payout.items.map((item) => (
                <tr key={item.id} className="border-t border-panelBorder align-top">
                  <td className="px-5 py-4 font-medium text-copy-strong">#{item.ledgerEntryId.slice(0, 8)}</td>
                  <td className="px-5 py-4"><MoneyAmount amount={item.amount} currency={payout.currency} /></td>
                  <td className="px-5 py-4 text-copy-secondary">{new Date(item.createdAt).toLocaleString('uk-UA')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
