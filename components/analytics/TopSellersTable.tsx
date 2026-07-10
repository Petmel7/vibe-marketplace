import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import type { AnalyticsTopSeller } from '@/types/analytics'
import { formatPrice } from '@/utils/formatters/price'

export default function TopSellersTable({
  items,
}: {
  items: AnalyticsTopSeller[]
}) {
  return (
    <AdminDataTable
      title="Топ продавці"
      description="Найсильніші оператори магазинів за виручкою у вибраному періоді."
    >
      {items.length === 0 ? (
        <div className="p-6">
          <AdminEmptyState
            title="Немає аналітики продавців"
            description="Список лідерів з’явиться, коли маркетплейс поверне продажі за вибраний період."
          />
        </div>
      ) : (
        <table className="min-w-full text-sm">
          <thead className="bg-panel/60 text-left text-copy-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Магазин</th>
              <th className="px-5 py-3 font-medium">Виручка</th>
              <th className="px-5 py-3 font-medium">Замовлення</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.storeId} className="border-t border-panelBorder">
                <td className="px-5 py-4 font-semibold text-copy-strong">{item.storeName}</td>
                <td className="px-5 py-4 text-copy-secondary">{formatPrice(item.revenue)}</td>
                <td className="px-5 py-4 text-copy-secondary">{item.orderCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminDataTable>
  )
}
