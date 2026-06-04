import Link from 'next/link'
import RefundAmount from './RefundAmount'
import RefundStatusBadge from './RefundStatusBadge'
import type { SellerRefundRequest } from '@/types/refunds'
import { getRefundReasonLabel } from '@/types/refunds'

export default function SellerRefundsTable({ items }: { items: SellerRefundRequest[] }) {
  return (
    <table className="min-w-full text-sm">
      <thead className="bg-panel/60 text-left text-copy-muted">
        <tr>
          <th className="px-5 py-3 font-medium">Товар</th>
          <th className="px-5 py-3 font-medium">Покупець</th>
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
              <p className="font-semibold text-copy-strong">{refund.productName ?? 'Позиція замовлення'}</p>
              <p className="mt-1 text-copy-muted">Замовлення #{refund.orderId.slice(0, 8)}</p>
            </td>
            <td className="px-5 py-4 text-copy-primary">{refund.buyerName}</td>
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
              <Link href={`/seller/refunds/${refund.id}`} className="ui-link-muted">
                Відкрити
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
