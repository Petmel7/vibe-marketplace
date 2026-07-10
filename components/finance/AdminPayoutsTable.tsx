import Link from 'next/link'
import MoneyAmount from './MoneyAmount'
import PayoutStatusBadge from './PayoutStatusBadge'
import { getPayoutMethodLabel, type AdminPayout } from '@/types/payouts'

export default function AdminPayoutsTable({ items }: { items: AdminPayout[] }) {
  return (
    <table className="min-w-full text-sm">
      <thead className="bg-panel/60 text-left text-copy-muted">
        <tr>
          <th className="px-5 py-3 font-medium">Магазин</th>
          <th className="px-5 py-3 font-medium">Продавець</th>
          <th className="px-5 py-3 font-medium">Сума</th>
          <th className="px-5 py-3 font-medium">Статус</th>
          <th className="px-5 py-3 font-medium">Метод</th>
          <th className="px-5 py-3 font-medium">Створено</th>
          <th className="px-5 py-3 font-medium">Відкрити</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-t border-panelBorder align-top">
            <td className="px-5 py-4">
              <p className="font-semibold text-copy-strong">{item.storeName}</p>
              <p className="mt-1 text-copy-muted">{item.storeId}</p>
            </td>
            <td className="px-5 py-4">
              <p className="font-medium text-copy-strong">{item.sellerName ?? item.sellerEmail}</p>
              <p className="mt-1 text-copy-muted">{item.sellerEmail}</p>
            </td>
            <td className="px-5 py-4"><MoneyAmount amount={item.amount} currency={item.currency} emphasize /></td>
            <td className="px-5 py-4"><PayoutStatusBadge status={item.status} /></td>
            <td className="px-5 py-4 text-copy-secondary">{getPayoutMethodLabel(item.method)}</td>
            <td className="px-5 py-4 text-copy-secondary">{new Date(item.createdAt).toLocaleString('uk-UA')}</td>
            <td className="px-5 py-4">
              <Link href={`/admin/payouts/${item.id}`} className="ui-link-muted">Переглянути деталі</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
