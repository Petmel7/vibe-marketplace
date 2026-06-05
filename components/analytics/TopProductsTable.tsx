import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import EmptyState from '@/components/profile/EmptyState'
import SellerTable from '@/components/seller/SellerTable'
import type { AnalyticsTopProduct } from '@/types/analytics'
import { formatPrice } from '@/utils/formatters/price'

export default function TopProductsTable({
  items,
  title = 'Топ товари',
  description,
  variant = 'seller',
}: {
  items: AnalyticsTopProduct[]
  title?: string
  description?: string
  variant?: 'seller' | 'admin'
}) {
  const TableShell = variant === 'admin' ? AdminDataTable : SellerTable

  return (
    <TableShell title={title} description={description}>
      {items.length === 0 ? (
        <div className="p-6">
          {variant === 'admin' ? (
            <AdminEmptyState
              title="Немає product analytics"
              description="Топ товари з’являться тут, коли маркетплейс поверне продажі за вибраний період."
            />
          ) : (
            <EmptyState
              title="Немає товарів для рейтингу"
              description="Тут з’являться лідери продажів, щойно вибраний період поверне замовлення."
            />
          )}
        </div>
      ) : (
        <table className="min-w-full text-sm">
          <thead className="bg-panel/60 text-left text-copy-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Товар</th>
              <th className="px-5 py-3 font-medium">Одиниць</th>
              <th className="px-5 py-3 font-medium">Виручка</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.productId} className="border-t border-panelBorder">
                <td className="px-5 py-4 font-semibold text-copy-strong">{item.name}</td>
                <td className="px-5 py-4 text-copy-secondary">{item.totalSold}</td>
                <td className="px-5 py-4 text-copy-secondary">{formatPrice(item.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </TableShell>
  )
}
