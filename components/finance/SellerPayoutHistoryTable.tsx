import PayoutStatusBadge from './PayoutStatusBadge'
import MoneyAmount from './MoneyAmount'
import { DataTable, TableCell, TableDateCell, TableHead, TableHeaderCell, TableRow, TableStatusCell } from '@/components/ui/table'
import { getPayoutMethodLabel, type SellerPayout } from '@/types/payouts'

export default function SellerPayoutHistoryTable({ items }: { items: SellerPayout[] }) {
  return (
    <DataTable>
      <TableHead>
        <tr>
          <TableHeaderCell>Сума</TableHeaderCell>
          <TableHeaderCell>Статус</TableHeaderCell>
          <TableHeaderCell>Спосіб</TableHeaderCell>
          <TableHeaderCell>Референс</TableHeaderCell>
          <TableHeaderCell>Деталі</TableHeaderCell>
          <TableHeaderCell>Створено</TableHeaderCell>
        </tr>
      </TableHead>
      <tbody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <MoneyAmount amount={item.amount} currency={item.currency} emphasize />
            </TableCell>
            <TableStatusCell>
              <PayoutStatusBadge status={item.status} />
            </TableStatusCell>
            <TableCell tone="secondary">{getPayoutMethodLabel(item.method)}</TableCell>
            <TableCell tone="secondary">{item.reference ?? '—'}</TableCell>
            <TableCell tone="secondary">
              {item.paidAt
                ? `Виплачено ${new Date(item.paidAt).toLocaleString('uk-UA')}`
                : item.failedAt
                  ? `Помилка ${new Date(item.failedAt).toLocaleString('uk-UA')}`
                  : `${item.itemCount} ledger item(s)`}
            </TableCell>
            <TableDateCell value={item.createdAt} />
          </TableRow>
        ))}
      </tbody>
    </DataTable>
  )
}
