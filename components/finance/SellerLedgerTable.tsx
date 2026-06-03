import Link from 'next/link'
import LedgerEntryStatusBadge from './LedgerEntryStatusBadge'
import MoneyAmount from './MoneyAmount'
import { getLedgerEntryTypeLabel, type SellerLedgerEntry } from '@/types/payouts'

export default function SellerLedgerTable({ items }: { items: SellerLedgerEntry[] }) {
  return (
    <table className="min-w-full text-sm">
      <thead className="bg-panel/60 text-left text-copy-muted">
        <tr>
          <th className="px-5 py-3 font-medium">Тип</th>
          <th className="px-5 py-3 font-medium">Статус</th>
          <th className="px-5 py-3 font-medium">Сума</th>
          <th className="px-5 py-3 font-medium">Опис</th>
          <th className="px-5 py-3 font-medium">Доступно з</th>
          <th className="px-5 py-3 font-medium">Створено</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-t border-panelBorder align-top">
            <td className="px-5 py-4 font-medium text-copy-strong">{getLedgerEntryTypeLabel(item.type)}</td>
            <td className="px-5 py-4">
              <LedgerEntryStatusBadge status={item.status} />
            </td>
            <td className="px-5 py-4">
              <MoneyAmount amount={item.amount} currency={item.currency} />
            </td>
            <td className="px-5 py-4">
              <p className="font-medium text-copy-strong">{item.description}</p>
              <p className="mt-1 text-copy-muted">{item.storeName}</p>
              {item.payoutId ? (
                <Link href={`/seller/finance/payouts`} className="mt-2 inline-flex text-copy-secondary underline underline-offset-4">
                  Payout #{item.payoutId.slice(0, 8)}
                </Link>
              ) : null}
            </td>
            <td className="px-5 py-4 text-copy-secondary">
              {item.availableAt ? new Date(item.availableAt).toLocaleString('uk-UA') : '—'}
            </td>
            <td className="px-5 py-4 text-copy-secondary">
              {new Date(item.createdAt).toLocaleString('uk-UA')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
