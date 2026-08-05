import Link from 'next/link'
import MoneyAmount from './MoneyAmount'
import PayoutStatusBadge from './PayoutStatusBadge'
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
import { getPayoutMethodLabel, type AdminPayout } from '@/types/payouts'

export default function AdminPayoutsTable({ items }: { items: AdminPayout[] }) {
  return (
    <DataTable>
      <TableHead>
        <tr>
          <TableHeaderCell>Магазин</TableHeaderCell>
          <TableHeaderCell>Продавець</TableHeaderCell>
          <TableHeaderCell>Сума</TableHeaderCell>
          <TableHeaderCell>Статус</TableHeaderCell>
          <TableHeaderCell>Метод</TableHeaderCell>
          <TableHeaderCell>Створено</TableHeaderCell>
          <TableHeaderCell>Відкрити</TableHeaderCell>
        </tr>
      </TableHead>
      <tbody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableMetaCell title={item.storeName} meta={item.storeId} />
            <TableMetaCell
              title={item.sellerName ?? item.sellerEmail}
              meta={item.sellerEmail}
              titleClassName="font-medium text-copy-strong"
            />
            <TableMoneyCell>
              <MoneyAmount amount={item.amount} currency={item.currency} emphasize />
            </TableMoneyCell>
            <TableStatusCell>
              <PayoutStatusBadge status={item.status} />
            </TableStatusCell>
            <TableCell tone="secondary">{getPayoutMethodLabel(item.method)}</TableCell>
            <TableDateCell value={item.createdAt} />
            <TableActionCell>
              <Link href={`/admin/payouts/${item.id}`} className="ui-link-muted">Переглянути деталі</Link>
            </TableActionCell>
          </TableRow>
        ))}
      </tbody>
    </DataTable>
  )
}
