import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import { DataTable, TableCell, TableHead, TableHeaderCell, TableMoneyCell, TableRow } from '@/components/ui/table'
import type { AnalyticsTopSeller } from '@/types/analytics'

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
        <DataTable>
          <TableHead>
            <tr>
              <TableHeaderCell>Магазин</TableHeaderCell>
              <TableHeaderCell>Виручка</TableHeaderCell>
              <TableHeaderCell>Замовлення</TableHeaderCell>
            </tr>
          </TableHead>
          <tbody>
            {items.map((item) => (
              <TableRow key={item.storeId}>
                <TableCell className="font-semibold text-copy-strong">{item.storeName}</TableCell>
                <TableMoneyCell amount={item.revenue} />
                <TableCell tone="secondary">{item.orderCount}</TableCell>
              </TableRow>
            ))}
          </tbody>
        </DataTable>
      )}
    </AdminDataTable>
  )
}
