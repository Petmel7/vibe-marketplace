import PayoutStatusBadge from './PayoutStatusBadge'
import MoneyAmount from './MoneyAmount'
import { getPayoutMethodLabel, type SellerPayout } from '@/types/payouts'

export default function SellerPayoutHistoryTable({ items }: { items: SellerPayout[] }) {
  return (
    <table className="min-w-full text-sm">
      <thead className="bg-panel/60 text-left text-copy-muted">
        <tr>
          <th className="px-5 py-3 font-medium">Сума</th>
          <th className="px-5 py-3 font-medium">Статус</th>
          <th className="px-5 py-3 font-medium">Спосіб</th>
          <th className="px-5 py-3 font-medium">Референс</th>
          <th className="px-5 py-3 font-medium">Деталі</th>
          <th className="px-5 py-3 font-medium">Створено</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-t border-panelBorder align-top">
            <td className="px-5 py-4">
              <MoneyAmount amount={item.amount} currency={item.currency} emphasize />
            </td>
            <td className="px-5 py-4">
              <PayoutStatusBadge status={item.status} />
            </td>
            <td className="px-5 py-4 text-copy-secondary">{getPayoutMethodLabel(item.method)}</td>
            <td className="px-5 py-4 text-copy-secondary">{item.reference ?? '—'}</td>
            <td className="px-5 py-4 text-copy-secondary">
              {item.paidAt
                ? `Виплачено ${new Date(item.paidAt).toLocaleString('uk-UA')}`
                : item.failedAt
                  ? `Помилка ${new Date(item.failedAt).toLocaleString('uk-UA')}`
                  : `${item.itemCount} ledger item(s)`}
            </td>
            <td className="px-5 py-4 text-copy-secondary">{new Date(item.createdAt).toLocaleString('uk-UA')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
