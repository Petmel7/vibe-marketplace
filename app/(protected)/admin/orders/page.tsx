import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import PaginationControls from '@/components/admin/PaginationControls'
import StatusFilter from '@/components/admin/StatusFilter'
import { getCurrentUser } from '@/lib/session/getSession'
import { formatPrice } from '@/utils/formatters/price'
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
        <StatusFilter
          name="status"
          label="Статус замовлення"
          defaultValue={data.filters.status}
          options={ADMIN_ORDER_STATUS_FILTERS.map((status) => ({ label: ORDER_STATUS_LABELS[status] ?? status, value: status }))}
        />
        <label className="space-y-2 xl:w-52">
          <span className="block text-sm font-medium text-copy-strong">Дата від</span>
          <input type="date" name="dateFrom" defaultValue={data.filters.dateFrom} className="ui-surface-input" />
        </label>
        <label className="space-y-2 xl:w-52">
          <span className="block text-sm font-medium text-copy-strong">Дата до</span>
          <input type="date" name="dateTo" defaultValue={data.filters.dateTo} className="ui-surface-input" />
        </label>
        <div className="flex gap-2 xl:self-end">
          <button type="submit" className="ui-primary-button">Застосувати фільтри</button>
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
          <table className="min-w-full text-sm">
            <thead className="bg-panel/60 text-left text-copy-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Замовлення</th>
                <th className="px-5 py-3 font-medium">Покупець</th>
                <th className="px-5 py-3 font-medium">Мережа магазинів</th>
                <th className="px-5 py-3 font-medium">Сума</th>
                <th className="px-5 py-3 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((order) => (
                <tr key={order.id} className="border-t border-panelBorder align-top">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-copy-strong">Замовлення #{order.id.slice(0, 8)}</p>
                    <p className="mt-1 text-copy-muted">{new Date(order.createdAt).toLocaleDateString('uk-UA')}</p>
                    <p className="mt-2 text-copy-secondary">{order.itemCount} товар(ів)</p>
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">
                    <p>{order.buyerEmail}</p>
                    <p className="mt-1 text-copy-muted">Покупець {order.buyerId.slice(0, 8)}</p>
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">
                    <p>{order.storeNames.join(', ')}</p>
                    <p className="mt-1 text-copy-muted">
                      {order.items.slice(0, 2).map((item) => item.productNameSnapshot).join(', ')}
                      {order.items.length > 2 ? '…' : ''}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">{formatPrice(order.totalAmount)}</td>
                  <td className="px-5 py-4">
                    <AdminStatusBadge label={ORDER_STATUS_LABELS[order.status] ?? order.status} tone={getAdminOrderStatusTone(order.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
