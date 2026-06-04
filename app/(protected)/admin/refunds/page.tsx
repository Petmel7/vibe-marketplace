import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import PaginationControls from '@/components/admin/PaginationControls'
import SearchInput from '@/components/admin/SearchInput'
import StatusFilter from '@/components/admin/StatusFilter'
import AdminRefundsTable from '@/components/refunds/AdminRefundsTable'
import { REFUND_REQUEST_REASONS, REFUND_REQUEST_STATUSES, getRefundReasonLabel, getRefundStatusLabel } from '@/types/refunds'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminRefundsPageData } from '@/app/(protected)/admin/_lib/admin-refunds.data'

export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminRefundsPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Refund Center"
      title="Refund requests"
      description="Керуйте ручним review flow, підтверджуйте фінальні стани та тримайте повернення повністю backend-authoritative."
    >
      <AdminFilterBar action="/admin/refunds">
        <StatusFilter
          name="status"
          label="Status"
          defaultValue={data.filters.status}
          options={REFUND_REQUEST_STATUSES.map((status) => ({ label: getRefundStatusLabel(status), value: status }))}
        />
        <StatusFilter
          name="reason"
          label="Reason"
          defaultValue={data.filters.reason}
          options={REFUND_REQUEST_REASONS.map((reason) => ({ label: getRefundReasonLabel(reason), value: reason }))}
        />
        <SearchInput
          name="storeId"
          label="Store id"
          defaultValue={data.filters.storeId}
          placeholder="Filter by store UUID"
        />
        <SearchInput
          name="requestedById"
          label="Buyer id"
          defaultValue={data.filters.requestedById}
          placeholder="Filter by buyer UUID"
        />
        <label className="space-y-2 xl:w-56">
          <span className="block text-sm font-medium text-copy-strong">From date</span>
          <input
            type="date"
            name="dateFrom"
            defaultValue={data.filters.dateFrom ? data.filters.dateFrom.slice(0, 10) : ''}
            className="ui-surface-input"
          />
        </label>
        <label className="space-y-2 xl:w-56">
          <span className="block text-sm font-medium text-copy-strong">To date</span>
          <input
            type="date"
            name="dateTo"
            defaultValue={data.filters.dateTo ? data.filters.dateTo.slice(0, 10) : ''}
            className="ui-surface-input"
          />
        </label>
        <div className="flex gap-2 xl:self-end">
          <button type="submit" className="ui-primary-button">Apply filters</button>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Refund queue"
        description="Список показує buyer request context, суму та поточний статус. Деталі відкривають повний audit trail."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No refund requests found"
              description="Розширте фільтри або дочекайтеся нових buyer requests."
            />
          </div>
        ) : (
          <AdminRefundsTable items={data.items} />
        )}
      </AdminDataTable>

      <PaginationControls
        pathname="/admin/refunds"
        page={data.page}
        limit={data.limit}
        total={data.total}
        query={{
          status: data.filters.status,
          reason: data.filters.reason,
          storeId: data.filters.storeId,
          requestedById: data.filters.requestedById,
          dateFrom: data.filters.dateFrom?.slice(0, 10),
          dateTo: data.filters.dateTo?.slice(0, 10),
        }}
      />
    </AdminSection>
  )
}
