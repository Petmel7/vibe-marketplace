import Link from 'next/link'
import RefundAmount from './RefundAmount'
import RefundStatusBadge from './RefundStatusBadge'
import { DataTable, TableActionCell, TableCell, TableDateCell, TableHead, TableHeaderCell, TableMetaCell, TableRow, TableStatusCell } from '@/components/ui/table'
import type { SellerRefundRequest } from '@/types/refunds'
import { getRefundReasonLabel } from '@/types/refunds'

export default function SellerRefundsTable({ items }: { items: SellerRefundRequest[] }) {
  return (
    <DataTable>
      <TableHead>
        <tr>
          <TableHeaderCell>Товар</TableHeaderCell>
          <TableHeaderCell>Покупець</TableHeaderCell>
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
            <TableMetaCell title={refund.productName ?? 'Позиція замовлення'} meta={`Замовлення #${refund.orderId.slice(0, 8)}`} />
            <TableCell tone="primary">{refund.buyerName}</TableCell>
            <TableCell tone="secondary">{getRefundReasonLabel(refund.reason)}</TableCell>
            <TableCell>
              <RefundAmount amount={refund.amount} currency={refund.currency} emphasize />
            </TableCell>
            <TableStatusCell>
              <RefundStatusBadge status={refund.status} />
            </TableStatusCell>
            <TableDateCell value={refund.createdAt} />
            <TableActionCell>
              <Link href={`/seller/refunds/${refund.id}`} className="ui-link-muted">
                Відкрити
              </Link>
            </TableActionCell>
          </TableRow>
        ))}
      </tbody>
    </DataTable>
  )
}
