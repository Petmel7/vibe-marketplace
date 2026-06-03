import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import PaginationControls from '@/components/admin/PaginationControls'
import SearchInput from '@/components/admin/SearchInput'
import StatusFilter from '@/components/admin/StatusFilter'
import AdminPayoutsTable from '@/components/finance/AdminPayoutsTable'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminPayoutsPageData } from '@/app/(protected)/admin/_lib/admin-payouts.data'
import { PAYOUT_STATUSES, getPayoutStatusLabel } from '@/types/payouts'

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminPayoutsPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Seller finance"
      title="Manual payouts"
      description="Review payout batches, inspect their state, and update lifecycle status without exposing provider-side settlement details."
    >
      <AdminFilterBar action="/admin/payouts">
        <StatusFilter
          name="status"
          label="Status"
          defaultValue={data.filters.status}
          options={PAYOUT_STATUSES.map((status) => ({ label: getPayoutStatusLabel(status), value: status }))}
        />
        <SearchInput
          name="sellerId"
          label="Seller id"
          defaultValue={data.filters.sellerId}
          placeholder="Filter by seller UUID"
        />
        <SearchInput
          name="storeId"
          label="Store id"
          defaultValue={data.filters.storeId}
          placeholder="Filter by store UUID"
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
        title="Payout queue"
        description="Use payout details to confirm the included ledger entries and apply financial status changes carefully."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No payouts found"
              description="Create a payout from seller balances or widen the current filters."
              actionHref="/admin/seller-balances"
              actionLabel="Open seller balances"
            />
          </div>
        ) : (
          <AdminPayoutsTable items={data.items} />
        )}
      </AdminDataTable>

      <PaginationControls
        pathname="/admin/payouts"
        page={data.page}
        limit={data.limit}
        total={data.total}
        query={{
          status: data.filters.status,
          sellerId: data.filters.sellerId,
          storeId: data.filters.storeId,
          dateFrom: data.filters.dateFrom,
          dateTo: data.filters.dateTo,
          limit: String(data.limit),
        }}
      />
    </AdminSection>
  )
}
