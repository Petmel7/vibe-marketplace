import Link from 'next/link'
import DisputeStatusBadge from './DisputeStatusBadge'
import {
  DataTable,
  TableActionCell,
  TableCell,
  TableDateCell,
  TableHead,
  TableHeaderCell,
  TableMetaCell,
  TableRow,
  TableStatusCell,
} from '@/components/ui/table'
import {
  getDisputePriorityLabel,
  getDisputeReasonLabel,
  type DisputeSummary,
} from '@/types/disputes'

export default function AdminDisputesTable({ disputes }: { disputes: DisputeSummary[] }) {
  return (
    <DataTable className="divide-y divide-panelBorder text-left">
      <TableHead className="bg-panelAlt/70 text-copy-secondary">
        <tr>
          <TableHeaderCell>Суперечка</TableHeaderCell>
          <TableHeaderCell>Причина</TableHeaderCell>
          <TableHeaderCell>Пріоритет</TableHeaderCell>
          <TableHeaderCell>Статус</TableHeaderCell>
          <TableHeaderCell>Створено</TableHeaderCell>
          <TableHeaderCell>Дія</TableHeaderCell>
        </tr>
      </TableHead>
      <tbody className="divide-y divide-panelBorder">
        {disputes.map((dispute) => (
          <TableRow key={dispute.id} className="border-t-0">
            <TableMetaCell
              title={`#${dispute.id.slice(0, 8)}`}
              meta={(
                <>
                  <p className="text-copy-secondary">{dispute.productName ?? 'Суперечка щодо замовлення'}</p>
                  <p>{dispute.storeName ?? `Order #${dispute.orderId.slice(0, 8)}`}</p>
                </>
              )}
            />
            <TableCell>{getDisputeReasonLabel(dispute.reason)}</TableCell>
            <TableCell>{getDisputePriorityLabel(dispute.priority)}</TableCell>
            <TableStatusCell>
              <DisputeStatusBadge status={dispute.status} />
            </TableStatusCell>
            <TableDateCell value={dispute.createdAt} mode="date" />
            <TableActionCell>
              <Link href={`/admin/disputes/${dispute.id}`} className="ui-secondary-button">
                Відкрити
              </Link>
            </TableActionCell>
          </TableRow>
        ))}
      </tbody>
    </DataTable>
  )
}
