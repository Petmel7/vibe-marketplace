import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import PaginationControls from '@/components/admin/PaginationControls'
import SearchInput from '@/components/admin/SearchInput'
import AdminSellerBalancesTable from '@/components/finance/AdminSellerBalancesTable'
import RecalculateSellerBalancesButton from '@/components/finance/RecalculateSellerBalancesButton'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminSellerBalancesPageData } from '@/app/(protected)/admin/_lib/admin-payouts.data'

export default async function AdminSellerBalancesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminSellerBalancesPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Seller finance"
      title="Seller balances"
      description="Review pending, available, and paid-out balances before creating manual payouts."
    >
      <div className="ui-elevated-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-copy-strong">Balance recalculation</h2>
          <p className="text-sm text-copy-secondary">
            Use this manual trigger when held funds should become available and no background worker is running yet.
          </p>
        </div>
        <RecalculateSellerBalancesButton />
      </div>

      <AdminFilterBar action="/admin/seller-balances">
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
        <div className="flex gap-2 xl:self-end">
          <button type="submit" className="ui-primary-button">Apply filters</button>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Seller balances"
        description="Create payouts only for available balances. The current backend expects exact available ledger batches."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No seller balances found"
              description="Try a different seller or store filter, or recalculate balances after seller-actionable orders land."
            />
          </div>
        ) : (
          <AdminSellerBalancesTable items={data.items} />
        )}
      </AdminDataTable>

      <PaginationControls
        pathname="/admin/seller-balances"
        page={data.page}
        limit={data.limit}
        total={data.total}
        query={{
          sellerId: data.filters.sellerId,
          storeId: data.filters.storeId,
          limit: String(data.limit),
        }}
      />
    </AdminSection>
  )
}
