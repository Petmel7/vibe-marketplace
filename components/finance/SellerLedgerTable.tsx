import Link from 'next/link'
import LedgerEntryStatusBadge from './LedgerEntryStatusBadge'
import MoneyAmount from './MoneyAmount'
import { DataTable, TableCell, TableDateCell, TableHead, TableHeaderCell, TableRow, TableStatusCell } from '@/components/ui/table'
import { getLedgerEntryTypeLabel, type SellerLedgerEntry } from '@/types/payouts'

export default function SellerLedgerTable({ items }: { items: SellerLedgerEntry[] }) {
  return (
    <DataTable>
      <TableHead>
        <tr>
          <TableHeaderCell>Тип</TableHeaderCell>
          <TableHeaderCell>Статус</TableHeaderCell>
          <TableHeaderCell>Сума</TableHeaderCell>
          <TableHeaderCell>Опис</TableHeaderCell>
          <TableHeaderCell>Доступно з</TableHeaderCell>
          <TableHeaderCell>Створено</TableHeaderCell>
        </tr>
      </TableHead>
      <tbody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium text-copy-strong">{getLedgerEntryTypeLabel(item.type)}</TableCell>
            <TableStatusCell>
              <LedgerEntryStatusBadge status={item.status} />
            </TableStatusCell>
            <TableCell>
              <MoneyAmount amount={item.amount} currency={item.currency} />
            </TableCell>
            <TableCell>
              <p className="font-medium text-copy-strong">{item.description}</p>
              <p className="mt-1 text-copy-muted">{item.storeName}</p>
              {item.payoutId ? (
                <Link href={`/seller/finance/payouts`} className="mt-2 inline-flex text-copy-secondary underline underline-offset-4">
                  Payout #{item.payoutId.slice(0, 8)}
                </Link>
              ) : null}
            </TableCell>
            <TableDateCell value={item.availableAt} />
            <TableDateCell value={item.createdAt} />
          </TableRow>
        ))}
      </tbody>
    </DataTable>
  )
}
