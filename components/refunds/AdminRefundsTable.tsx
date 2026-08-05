import Link from 'next/link'
import RefundAmount from './RefundAmount'
import RefundStatusBadge from './RefundStatusBadge'
import {
  DataTable,
  TableActionCell,
  TableCell,
  TableDateCell,
  TableHead,
  TableHeaderCell,
  TableMetaCell,
  TableMoneyCell,
  TableRow,
  TableStatusCell,
} from '@/components/ui/table'
import type { AdminRefundRequest } from '@/types/refunds'
import { getRefundReasonLabel } from '@/types/refunds'

export default function AdminRefundsTable({ items }: { items: AdminRefundRequest[] }) {
  return (
    <DataTable>
      <TableHead>
        <tr>
          <TableHeaderCell>Запит</TableHeaderCell>
          <TableHeaderCell>Покупець</TableHeaderCell>
          <TableHeaderCell>Магазин</TableHeaderCell>
          <TableHeaderCell>Причина</TableHeaderCell>
          <TableHeaderCell>Сума</TableHeaderCell>
          <TableHeaderCell>Статус</TableHeaderCell>
          <TableHeaderCell>Створено</TableHeaderCell>
          <TableHeaderCell>Деталі</TableHeaderCell>
        </tr>
      </TableHead>
      <tbody>
        {items.map((refund) => (
          <TableRow key={refund.id}>
            <TableMetaCell
              title={`#${refund.id.slice(0, 8)}`}
              meta={`Замовлення #${refund.orderId.slice(0, 8)}`}
            >
              <p className="mt-1 text-copy-muted">{refund.productName ?? 'Позиція замовлення'}</p>
            </TableMetaCell>
            <TableMetaCell
              title={refund.requestedByName}
              meta={refund.requestedById}
              titleClassName="font-medium text-copy-strong"
            />
            <TableCell tone="secondary">{refund.storeName ?? 'Маркетплейс'}</TableCell>
            <TableCell tone="secondary">{getRefundReasonLabel(refund.reason)}</TableCell>
            <TableMoneyCell>
              <RefundAmount amount={refund.amount} currency={refund.currency} emphasize />
            </TableMoneyCell>
            <TableStatusCell>
              <RefundStatusBadge status={refund.status} />
            </TableStatusCell>
            <TableDateCell value={refund.createdAt} />
            <TableActionCell>
              <Link href={`/admin/refunds/${refund.id}`} className="ui-link-muted">
                Відкрити
              </Link>
            </TableActionCell>
          </TableRow>
        ))}
      </tbody>
    </DataTable>
  )
}
