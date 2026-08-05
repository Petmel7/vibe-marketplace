import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import PaginationControls from '@/components/admin/PaginationControls'
import {
  DataTable,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableMetaCell,
  TableMoneyCell,
  TableRow,
  TableStatusCell,
} from '@/components/ui/table'
import { getCurrentUser } from '@/lib/session/getSession'
import { ADMIN_ORDER_STATUS_FILTERS, getAdminOrderStatusTone } from '@/types/admin'
import { getAdminOrdersPageData } from '@/app/(protected)/admin/_lib/admin-dashboard.data'

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Очікує',
  confirmed: 'Підтверджено',
  paid: 'Оплачено',
  processing: 'Обробляється',
  shipped: 'Відправлено',
  delivered: 'Доставлено',
  cancelled: 'Скасовано',
  refunded: 'Повернено',
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const rawSearchParams = await searchParams
  const data = await getAdminOrdersPageData(user, rawSearchParams)

  return (
    <AdminSection
      eyebrow="Замовлення"
      title="Глобальний контроль замовлень"
      description="Відстежуйте рух замовлень покупців і продавців, загальні суми виторгу маркетплейсу та контекст виконання між магазинами."
    >
      <AdminFilterBar action="/admin/orders">
        <div className="flex w-full flex-col items-center gap-3 max-[500px]:items-stretch">
          <div className="grid w-full max-w-md gap-3 max-[500px]:max-w-none min-[1146px]:max-w-none min-[1146px]:grid-cols-3">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Статус замовлення</span>
              <select name="status" defaultValue={data.filters.status ?? ''} className="ui-surface-input w-full">
                <option value="">Усі</option>
                {ADMIN_ORDER_STATUS_FILTERS.map((status) => (
                  <option key={status} value={status}>
                    {ORDER_STATUS_LABELS[status] ?? status}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Дата від</span>
              <input type="date" name="dateFrom" defaultValue={data.filters.dateFrom} className="ui-surface-input w-full" />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Дата до</span>
              <input type="date" name="dateTo" defaultValue={data.filters.dateTo} className="ui-surface-input w-full" />
            </label>
          </div>
          <button type="submit" className="ui-primary-button max-[500px]:w-full">
            Застосувати фільтри
          </button>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Замовлення маркетплейсу"
        description="Зведення замовлень по всьому маркетплейсу з посиланням на покупця та знімками даних продавців і магазинів."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="У цьому поданні немає замовлень"
              description="Змініть діапазон дат або фільтр статусу, щоб побачити записи для контролю замовлень."
            />
          </div>
        ) : (
          <DataTable>
            <TableHead>
              <tr>
                <TableHeaderCell>Замовлення</TableHeaderCell>
                <TableHeaderCell>Покупець</TableHeaderCell>
                <TableHeaderCell>Мережа магазинів</TableHeaderCell>
                <TableHeaderCell>Сума</TableHeaderCell>
                <TableHeaderCell>Статус</TableHeaderCell>
              </tr>
            </TableHead>
            <tbody>
              {data.items.map((order) => (
                <TableRow key={order.id}>
                  <TableMetaCell
                    title={`Замовлення #${order.id.slice(0, 8)}`}
                    meta={new Date(order.createdAt).toLocaleDateString('uk-UA')}
                  >
                    <p className="mt-2 text-copy-secondary">{order.itemCount} товар(ів)</p>
                  </TableMetaCell>
                  <TableCell tone="secondary">
                    <p>{order.buyerEmail}</p>
                    <p className="mt-1 text-copy-muted">Покупець {order.buyerId.slice(0, 8)}</p>
                  </TableCell>
                  <TableCell tone="secondary">
                    <p>{order.storeNames.join(', ')}</p>
                    <p className="mt-1 text-copy-muted">
                      {order.items.slice(0, 2).map((item) => item.productNameSnapshot).join(', ')}
                      {order.items.length > 2 ? '…' : ''}
                    </p>
                  </TableCell>
                  <TableMoneyCell amount={order.totalAmount} />
                  <TableStatusCell>
                    <AdminStatusBadge label={ORDER_STATUS_LABELS[order.status] ?? order.status} tone={getAdminOrderStatusTone(order.status)} />
                  </TableStatusCell>
                </TableRow>
              ))}
            </tbody>
          </DataTable>
        )}
      </AdminDataTable>

      <PaginationControls
        pathname="/admin/orders"
        page={data.page}
        limit={data.limit}
        total={data.total}
        query={{
          status: data.filters.status,
          dateFrom: data.filters.dateFrom,
          dateTo: data.filters.dateTo,
          limit: String(data.limit),
        }}
      />
    </AdminSection>
  )
}
