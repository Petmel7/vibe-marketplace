import CreatePayoutDialog from './CreatePayoutDialog'
import MoneyAmount from './MoneyAmount'
import type { SellerBalance } from '@/types/payouts'

export default function AdminSellerBalancesTable({ items }: { items: SellerBalance[] }) {
  return (
    <table className="min-w-full text-sm">
      <thead className="bg-panel/60 text-left text-copy-muted">
        <tr>
          <th className="px-5 py-3 font-medium">Seller / store</th>
          <th className="px-5 py-3 font-medium">Pending</th>
          <th className="px-5 py-3 font-medium">Available</th>
          <th className="px-5 py-3 font-medium">Paid out</th>
          <th className="px-5 py-3 font-medium">Updated</th>
          <th className="px-5 py-3 font-medium">Action</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.storeId} className="border-t border-panelBorder align-top">
            <td className="px-5 py-4">
              <p className="font-semibold text-copy-strong">{item.storeName}</p>
              <p className="mt-1 text-copy-muted">{item.sellerName ?? item.sellerEmail}</p>
              <p className="text-copy-muted">{item.sellerEmail}</p>
            </td>
            <td className="px-5 py-4"><MoneyAmount amount={item.pendingAmount} currency={item.currency} /></td>
            <td className="px-5 py-4"><MoneyAmount amount={item.availableAmount} currency={item.currency} emphasize /></td>
            <td className="px-5 py-4"><MoneyAmount amount={item.paidOutAmount} currency={item.currency} /></td>
            <td className="px-5 py-4 text-copy-secondary">{new Date(item.updatedAt).toLocaleString('uk-UA')}</td>
            <td className="px-5 py-4">
              <CreatePayoutDialog balance={item} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
