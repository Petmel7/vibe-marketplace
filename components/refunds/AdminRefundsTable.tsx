import Link from 'next/link'
import RefundAmount from './RefundAmount'
import RefundStatusBadge from './RefundStatusBadge'
import type { AdminRefundRequest } from '@/types/refunds'
import { getRefundReasonLabel } from '@/types/refunds'

export default function AdminRefundsTable({ items }: { items: AdminRefundRequest[] }) {
  return (
    <table className="min-w-full text-sm">
      <thead className="bg-panel/60 text-left text-copy-muted">
        <tr>
          <th className="px-5 py-3 font-medium">Запит</th>
          <th className="px-5 py-3 font-medium">Покупець</th>
          <th className="px-5 py-3 font-medium">Магазин</th>
          <th className="px-5 py-3 font-medium">Причина</th>
          <th className="px-5 py-3 font-medium">Сума</th>
          <th className="px-5 py-3 font-medium">Статус</th>
          <th className="px-5 py-3 font-medium">Створено</th>
          <th className="px-5 py-3 font-medium">Деталі</th>
        </tr>
      </thead>
      <tbody>
        {items.map((refund) => (
          <tr key={refund.id} className="border-t border-panelBorder align-top">
            <td className="px-5 py-4">
              <p className="font-semibold text-copy-strong">#{refund.id.slice(0, 8)}</p>
              <p className="mt-1 text-copy-muted">Замовлення #{refund.orderId.slice(0, 8)}</p>
              <p className="mt-1 text-copy-muted">{refund.productName ?? 'Позиція замовлення'}</p>
            </td>
            <td className="px-5 py-4">
              <p className="font-medium text-copy-strong">{refund.requestedByName}</p>
              <p className="mt-1 text-copy-muted">{refund.requestedById}</p>
            </td>
            <td className="px-5 py-4 text-copy-secondary">{refund.storeName ?? 'Marketplace'}</td>
            <td className="px-5 py-4 text-copy-secondary">{getRefundReasonLabel(refund.reason)}</td>
            <td className="px-5 py-4">
              <RefundAmount amount={refund.amount} currency={refund.currency} emphasize />
            </td>
            <td className="px-5 py-4">
              <RefundStatusBadge status={refund.status} />
            </td>
            <td className="px-5 py-4 text-copy-secondary">
              {new Date(refund.createdAt).toLocaleString('uk-UA')}
            </td>
            <td className="px-5 py-4">
              <Link href={`/admin/refunds/${refund.id}`} className="ui-link-muted">
                Відкрити
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
