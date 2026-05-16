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
      eyebrow="Orders"
      title="Global order oversight"
      description="Track buyer and seller order flow, marketplace revenue totals, and cross-store fulfillment context."
    >
      <AdminFilterBar action="/admin/orders">
        <StatusFilter
          name="status"
          label="Order status"
          defaultValue={data.filters.status}
          options={ADMIN_ORDER_STATUS_FILTERS.map((status) => ({ label: status, value: status }))}
        />
        <label className="space-y-2 xl:w-52">
          <span className="block text-sm font-medium text-copy-strong">Date from</span>
          <input type="date" name="dateFrom" defaultValue={data.filters.dateFrom} className="ui-surface-input" />
        </label>
        <label className="space-y-2 xl:w-52">
          <span className="block text-sm font-medium text-copy-strong">Date to</span>
          <input type="date" name="dateTo" defaultValue={data.filters.dateTo} className="ui-surface-input" />
        </label>
        <div className="flex gap-2 xl:self-end">
          <button type="submit" className="ui-primary-button">Apply filters</button>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Marketplace orders"
        description="Marketplace-wide order summaries with buyer references and seller/store snapshots."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No orders in this view"
              description="Adjust the date window or status filter to surface order oversight records."
            />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-panel/60 text-left text-copy-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Order</th>
                <th className="px-5 py-3 font-medium">Buyer</th>
                <th className="px-5 py-3 font-medium">Store network</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((order) => (
                <tr key={order.id} className="border-t border-panelBorder align-top">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-copy-strong">Order #{order.id.slice(0, 8)}</p>
                    <p className="mt-1 text-copy-muted">{new Date(order.createdAt).toLocaleDateString('uk-UA')}</p>
                    <p className="mt-2 text-copy-secondary">{order.itemCount} items</p>
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">
                    <p>{order.buyerEmail}</p>
                    <p className="mt-1 text-copy-muted">Buyer {order.buyerId.slice(0, 8)}</p>
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
                    <AdminStatusBadge label={order.status} tone={getAdminOrderStatusTone(order.status)} />
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
