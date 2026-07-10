import Link from 'next/link'
import DisputeStatusBadge from './DisputeStatusBadge'
import {
  getDisputePriorityLabel,
  getDisputeReasonLabel,
  type DisputeSummary,
} from '@/types/disputes'

export default function AdminDisputesTable({ disputes }: { disputes: DisputeSummary[] }) {
  return (
    <table className="min-w-full divide-y divide-panelBorder text-left text-sm">
      <thead className="bg-panelAlt/70 text-copy-secondary">
        <tr>
          <th className="px-5 py-3 font-medium">Суперечка</th>
          <th className="px-5 py-3 font-medium">Причина</th>
          <th className="px-5 py-3 font-medium">Пріоритет</th>
          <th className="px-5 py-3 font-medium">Статус</th>
          <th className="px-5 py-3 font-medium">Створено</th>
          <th className="px-5 py-3 font-medium">Дія</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-panelBorder">
        {disputes.map((dispute) => (
          <tr key={dispute.id} className="align-top">
            <td className="px-5 py-4">
              <p className="font-semibold text-copy-strong">#{dispute.id.slice(0, 8)}</p>
              <p className="mt-1 text-copy-secondary">{dispute.productName ?? 'Суперечка щодо замовлення'}</p>
              <p className="mt-1 text-copy-muted">{dispute.storeName ?? `Order #${dispute.orderId.slice(0, 8)}`}</p>
            </td>
            <td className="px-5 py-4 text-copy-primary">{getDisputeReasonLabel(dispute.reason)}</td>
            <td className="px-5 py-4 text-copy-primary">{getDisputePriorityLabel(dispute.priority)}</td>
            <td className="px-5 py-4">
              <DisputeStatusBadge status={dispute.status} />
            </td>
            <td className="px-5 py-4 text-copy-secondary">
              {new Date(dispute.createdAt).toLocaleDateString('uk-UA')}
            </td>
            <td className="px-5 py-4">
              <Link href={`/admin/disputes/${dispute.id}`} className="ui-secondary-button">
                Відкрити
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
