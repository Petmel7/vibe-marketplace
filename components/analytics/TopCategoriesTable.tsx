import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import { DataTable, TableCell, TableHead, TableHeaderCell, TableMoneyCell, TableRow } from '@/components/ui/table'
import type { AnalyticsTopCategory } from '@/types/analytics'

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
        <DataTable>
          <TableHead>
            <tr>
              <TableHeaderCell>Категорія</TableHeaderCell>
              <TableHeaderCell>Продано одиниць</TableHeaderCell>
              <TableHeaderCell>Виручка</TableHeaderCell>
            </tr>
          </TableHead>
          <tbody>
            {items.map((item) => (
              <TableRow key={item.categoryId ?? item.name}>
                <TableCell className="font-semibold text-copy-strong">{item.name}</TableCell>
                <TableCell tone="secondary">{item.totalSold}</TableCell>
                <TableMoneyCell amount={item.revenue} />
              </TableRow>
            ))}
          </tbody>
        </DataTable>
      )}
    </AdminDataTable>
  )
}
