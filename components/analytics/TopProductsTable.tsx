import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import EmptyState from '@/components/profile/EmptyState'
import SellerTable from '@/components/seller/SellerTable'
import { DataTable, TableCell, TableHead, TableHeaderCell, TableMoneyCell, TableRow } from '@/components/ui/table'
import type { AnalyticsTopProduct } from '@/types/analytics'

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
              title="Немає аналітики товарів"
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
        <DataTable>
          <TableHead>
            <tr>
              <TableHeaderCell>Товар</TableHeaderCell>
              <TableHeaderCell>Продано одиниць</TableHeaderCell>
              <TableHeaderCell>Виручка</TableHeaderCell>
            </tr>
          </TableHead>
          <tbody>
            {items.map((item) => (
              <TableRow key={item.productId}>
                <TableCell className="font-semibold text-copy-strong">{item.name}</TableCell>
                <TableCell tone="secondary">{item.totalSold}</TableCell>
                <TableMoneyCell amount={item.revenue} />
              </TableRow>
            ))}
          </tbody>
        </DataTable>
      )}
    </TableShell>
  )
}
