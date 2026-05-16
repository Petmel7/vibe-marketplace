import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminMetricCard from '@/components/admin/AdminMetricCard'
import AdminSection from '@/components/admin/AdminSection'
import { getCurrentUser } from '@/lib/session/getSession'
import { formatPrice } from '@/utils/formatters/price'
import { getAdminAnalyticsPageData } from '@/app/(protected)/admin/_lib/admin-dashboard.data'

export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminAnalyticsPageData(user)

  return (
    <AdminSection
      eyebrow="Analytics"
      title="Marketplace analytics"
      description="Revenue, seller growth, order trends, and moderation pressure prepared for future chart and reporting integrations."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="GMV"
          value={formatPrice(data.gmv)}
          detail={`${data.totalOrders} total marketplace orders`}
        />
        <AdminMetricCard
          label="Seller growth"
          value={data.sellerGrowthLast30Days}
          detail="New seller profiles created in the last 30 days"
        />
        <AdminMetricCard
          label="Order growth"
          value={data.orderGrowthLast30Days}
          detail="Orders created in the last 30 days"
        />
        <AdminMetricCard
          label="Moderation pressure"
          value={data.moderationStats.pendingSellerApprovals + data.moderationStats.pendingProductApprovals}
          detail="Combined seller and product items waiting for moderation"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="ui-elevated-panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-copy-strong">Revenue and growth</h2>
          <p className="mt-1 text-sm text-copy-muted">
            Placeholder analytics area prepared for future chart libraries and richer trend visualizations.
          </p>
          <div className="mt-6 grid h-72 place-items-center rounded-3xl border border-dashed border-panelBorder bg-panel text-sm text-copy-muted">
            Marketplace analytics chart placeholder
          </div>
        </section>

        <section className="ui-elevated-panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-copy-strong">Moderation summary</h2>
          <p className="mt-1 text-sm text-copy-muted">
            Current pressure across seller approvals, product reviews, and escalated trust and safety cases.
          </p>
          <div className="mt-5 space-y-3 text-sm text-copy-secondary">
            <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
              <span>Pending seller approvals</span>
              <span className="font-semibold text-copy-strong">{data.moderationStats.pendingSellerApprovals}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
              <span>Pending product approvals</span>
              <span className="font-semibold text-copy-strong">{data.moderationStats.pendingProductApprovals}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
              <span>Suspended sellers</span>
              <span className="font-semibold text-copy-strong">{data.moderationStats.suspendedSellers}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
              <span>Rejected products</span>
              <span className="font-semibold text-copy-strong">{data.moderationStats.rejectedProducts}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminDataTable
          title="Top sellers"
          description="Highest-revenue storefront operators from the current analytics snapshot."
        >
          {data.topSellers.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState
                title="No seller analytics yet"
                description="Top-seller performance data will appear here after marketplace sales accumulate."
              />
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-panel/60 text-left text-copy-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Store</th>
                  <th className="px-5 py-3 font-medium">Revenue</th>
                  <th className="px-5 py-3 font-medium">Orders</th>
                </tr>
              </thead>
              <tbody>
                {data.topSellers.map((seller) => (
                  <tr key={seller.sellerId} className="border-t border-panelBorder">
                    <td className="px-5 py-4 font-semibold text-copy-strong">{seller.storeName}</td>
                    <td className="px-5 py-4 text-copy-secondary">{formatPrice(seller.revenue)}</td>
                    <td className="px-5 py-4 text-copy-secondary">{seller.orderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </AdminDataTable>

        <AdminDataTable
          title="Top products"
          description="Best-performing marketplace catalog items by unit sales and revenue."
        >
          {data.topProducts.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState
                title="No product analytics yet"
                description="Top-product performance data will appear here after order volume increases."
              />
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-panel/60 text-left text-copy-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Units sold</th>
                  <th className="px-5 py-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((product) => (
                  <tr key={product.productId} className="border-t border-panelBorder">
                    <td className="px-5 py-4 font-semibold text-copy-strong">{product.name}</td>
                    <td className="px-5 py-4 text-copy-secondary">{product.totalSold}</td>
                    <td className="px-5 py-4 text-copy-secondary">{formatPrice(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </AdminDataTable>
      </div>
    </AdminSection>
  )
}
