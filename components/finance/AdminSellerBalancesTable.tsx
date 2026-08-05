import CreatePayoutDialog from './CreatePayoutDialog'
import MoneyAmount from './MoneyAmount'
import {
  DataTable,
  TableActionCell,
  TableCell,
  TableDateCell,
  TableHead,
  TableHeaderCell,
  TableMetaCell,
  TableRow,
} from '@/components/ui/table'
import type { SellerBalance } from '@/types/payouts'

export default function AdminSellerBalancesTable({ items }: { items: SellerBalance[] }) {
  return (
    <DataTable>
      <TableHead>
        <tr>
          <TableHeaderCell>Продавець / магазин</TableHeaderCell>
          <TableHeaderCell>В очікуванні</TableHeaderCell>
          <TableHeaderCell>Доступно</TableHeaderCell>
          <TableHeaderCell>Виплачено</TableHeaderCell>
          <TableHeaderCell>Оновлено</TableHeaderCell>
          <TableHeaderCell>Дія</TableHeaderCell>
        </tr>
      </TableHead>
      <tbody>
        {items.map((item) => (
          <TableRow key={item.storeId}>
            <TableMetaCell
              title={item.storeName}
              meta={(
                <>
                  <p>{item.sellerName ?? item.sellerEmail}</p>
                  <p>{item.sellerEmail}</p>
                </>
              )}
            />
            <TableCell><MoneyAmount amount={item.pendingAmount} currency={item.currency} /></TableCell>
            <TableCell><MoneyAmount amount={item.availableAmount} currency={item.currency} emphasize /></TableCell>
            <TableCell><MoneyAmount amount={item.paidOutAmount} currency={item.currency} /></TableCell>
            <TableDateCell value={item.updatedAt} />
            <TableActionCell>
              <CreatePayoutDialog balance={item} />
            </TableActionCell>
          </TableRow>
        ))}
      </tbody>
    </DataTable>
  )
}
