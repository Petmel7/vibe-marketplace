import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import type { AnalyticsTopCategory } from '@/types/analytics'
import { formatPrice } from '@/utils/formatters/price'

export default function TopCategoriesTable({
  items,
}: {
  items: AnalyticsTopCategory[]
}) {
  return (
    <AdminDataTable
      title="Топ категорії"
      description="Категорії, які приносять найбільшу виручку та обсяг проданих одиниць у вибраному періоді."
    >
      {items.length === 0 ? (
        <div className="p-6">
          <AdminEmptyState
            title="Немає аналітики категорій"
            description="Категорії з’являться тут, коли бекенд поверне продажі з прив’язкою до каталогу."
          />
        </div>
      ) : (
        <table className="min-w-full text-sm">
          <thead className="bg-panel/60 text-left text-copy-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Категорія</th>
              <th className="px-5 py-3 font-medium">Продано одиниць</th>
              <th className="px-5 py-3 font-medium">Виручка</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.categoryId ?? item.name} className="border-t border-panelBorder">
                <td className="px-5 py-4 font-semibold text-copy-strong">{item.name}</td>
                <td className="px-5 py-4 text-copy-secondary">{item.totalSold}</td>
                <td className="px-5 py-4 text-copy-secondary">{formatPrice(item.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminDataTable>
  )
}
