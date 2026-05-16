import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminMetricCard from '@/components/admin/AdminMetricCard'
import AdminSection from '@/components/admin/AdminSection'
import AdminSellerModerationActions from '@/components/admin/AdminSellerModerationActions'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import PaginationControls from '@/components/admin/PaginationControls'
import StatusFilter from '@/components/admin/StatusFilter'
import { getCurrentUser } from '@/lib/session/getSession'
import { ADMIN_SELLER_STATUS_FILTERS, getAdminSellerStatusTone } from '@/types/admin'
import { getAdminSellersPageData } from '@/app/(protected)/admin/_lib/admin-dashboard.data'

export default async function AdminSellersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const rawSearchParams = await searchParams
  const data = await getAdminSellersPageData(user, rawSearchParams)

  return (
    <AdminSection
      eyebrow="Sellers"
      title="Seller management"
      description="Monitor verification state, storefront readiness signals, and seller-side marketplace exposure across the platform."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Total sellers"
          value={data.analytics.totalSellers}
          detail={`${data.analytics.moderationStats.pendingSellerApprovals} waiting for approval`}
        />
        <AdminMetricCard
          label="Seller growth"
          value={data.analytics.sellerGrowthLast30Days}
          detail="Seller profiles created in the last 30 days"
        />
        <AdminMetricCard
          label="Suspended sellers"
          value={data.analytics.moderationStats.suspendedSellers}
          detail="Accounts currently blocked from storefront activity"
        />
        <AdminMetricCard
          label="Top storefronts"
          value={data.analytics.topSellers.length}
          detail="Revenue leaders currently tracked in marketplace analytics"
        />
      </div>

      <AdminFilterBar action="/admin/sellers">
        <StatusFilter
          name="status"
          label="Verification status"
          defaultValue={data.filters.status}
          options={ADMIN_SELLER_STATUS_FILTERS.map((status) => ({
            label: status.replaceAll('_', ' '),
            value: status,
          }))}
        />
        <div className="flex gap-2 xl:self-end">
          <button type="submit" className="ui-primary-button">Apply filters</button>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        title="Seller accounts"
        description="Verification states, onboarding readiness, and storefront footprint for each seller."
      >
        {data.items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No sellers in this view"
              description="Adjust the status filter to surface more seller accounts."
            />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-panel/60 text-left text-copy-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Seller</th>
                <th className="px-5 py-3 font-medium">Verification</th>
                <th className="px-5 py-3 font-medium">Store footprint</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((seller) => (
                <tr key={seller.id} className="border-t border-panelBorder align-top">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-copy-strong">{seller.businessName || 'Unnamed seller'}</p>
                    <p className="mt-1 text-copy-muted">User {seller.userId.slice(0, 8)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <AdminStatusBadge label={seller.verificationStatus} tone={getAdminSellerStatusTone(seller.verificationStatus)} />
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">
                    <p>{seller.storeCount} connected stores</p>
                    <p className="mt-1 text-copy-muted">
                      {seller.storeCount > 0 ? 'Store network provisioned' : 'No stores provisioned yet'}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">{new Date(seller.createdAt).toLocaleDateString('uk-UA')}</td>
                  <td className="px-5 py-4">
                    <AdminSellerModerationActions sellerId={seller.id} verificationStatus={seller.verificationStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminDataTable>

      <PaginationControls
        pathname="/admin/sellers"
        page={data.page}
        limit={data.limit}
        total={data.total}
        query={{
          status: data.filters.status,
          limit: String(data.limit),
        }}
      />
    </AdminSection>
  )
}
