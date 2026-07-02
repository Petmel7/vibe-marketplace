import Link from 'next/link'
import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminMetricCard from '@/components/admin/AdminMetricCard'
import AdminSection from '@/components/admin/AdminSection'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import ModerationQueueCard from '@/components/admin/ModerationQueueCard'
import { getCurrentUser } from '@/lib/session/getSession'
import { formatPrice } from '@/utils/formatters/price'
import {
  getAdminProductStatusTone,
  getAdminSellerStatusTone,
} from '@/types/admin'
import { getAdminOverviewData } from '@/app/(protected)/admin/_lib/admin-dashboard.data'
import { logInfo } from '@/utils/logger'

export default async function AdminOverviewPage() {
  logInfo('admin-page:start', {
    domain: 'admin',
    route: '/admin',
  })
  const user = await getCurrentUser()
  if (!user) return null

  logInfo('admin-page:before-data', {
    domain: 'admin',
    route: '/admin',
    adminId: user.id,
  })
  const data = await getAdminOverviewData(user)
  logInfo('admin-page:after-data', {
    domain: 'admin',
    route: '/admin',
    adminId: user.id,
  })

  return (
    <AdminSection
      eyebrow="Marketplace overview"
      title="Admin dashboard"
      description="Track marketplace health, moderation pressure, and operational growth from one governance workspace."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard
          label="GMV"
          value={formatPrice(data.analytics.gmv)}
          detail={`${data.analytics.orderGrowthLast30Days} orders created in the last 30 days`}
        />
        <AdminMetricCard
          label="Orders"
          value={data.analytics.totalOrders}
          detail={`${data.analytics.moderationStats.pendingProductApprovals} products waiting on moderation`}
        />
        <AdminMetricCard
          label="Sellers"
          value={data.analytics.totalSellers}
          detail={`${data.analytics.sellerGrowthLast30Days} seller profiles created in the last 30 days`}
        />
        <AdminMetricCard
          label="Buyers"
          value={data.analytics.totalBuyers}
          detail="Active buyer accounts available for order and support oversight"
        />
        <AdminMetricCard
          label="Catalog"
          value={data.analytics.totalProducts}
          detail={`${data.analytics.moderationStats.rejectedProducts} rejected products currently tracked`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ModerationQueueCard
          label="Pending sellers"
          count={data.analytics.moderationStats.pendingSellerApprovals}
          description="Seller applications waiting for verification review."
          href="/admin/moderation"
        />
        <ModerationQueueCard
          label="Pending products"
          count={data.analytics.moderationStats.pendingProductApprovals}
          description="Products queued for marketplace publication approval."
          href="/admin/moderation"
        />
        <ModerationQueueCard
          label="Suspended sellers"
          count={data.analytics.moderationStats.suspendedSellers}
          description="Store operators currently blocked from marketplace activity."
          href="/admin/sellers?status=SUSPENDED"
        />
        <ModerationQueueCard
          label="Rejected products"
          count={data.analytics.moderationStats.rejectedProducts}
          description="Rejected catalog items that may need follow-up or archival."
          href="/admin/products?status=REJECTED"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <AdminDataTable
          title="Moderation pulse"
          description="The newest moderation items across sellers and products."
          actions={<Link href="/admin/moderation" className="ui-link-muted">Open moderation</Link>}
        >
          {data.pendingSellerQueue.items.length === 0 && data.pendingProductQueue.items.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState
                title="No pending moderation items"
                description="Seller applications and products awaiting approval will appear here automatically."
              />
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-panel/60 text-left text-copy-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Queue item</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">State</th>
                </tr>
              </thead>
              <tbody>
                {data.pendingSellerQueue.items.map((seller) => (
                  <tr key={`seller-${seller.id}`} className="border-t border-panelBorder align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-copy-strong">{seller.businessName || 'Unnamed seller application'}</p>
                      <p className="mt-1 text-copy-muted">Seller verification queue</p>
                    </td>
                    <td className="px-5 py-4 text-copy-secondary">{seller.userId.slice(0, 8)}</td>
                    <td className="px-5 py-4">
                      <AdminStatusBadge label={seller.verificationStatus} tone={getAdminSellerStatusTone(seller.verificationStatus)} />
                    </td>
                  </tr>
                ))}
                {data.pendingProductQueue.items.map((product) => (
                  <tr key={`product-${product.id}`} className="border-t border-panelBorder align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-copy-strong">{product.name}</p>
                      <p className="mt-1 text-copy-muted">Product moderation queue</p>
                    </td>
                    <td className="px-5 py-4 text-copy-secondary">{product.storeName}</td>
                    <td className="px-5 py-4">
                      <AdminStatusBadge label={product.status} tone={getAdminProductStatusTone(product.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </AdminDataTable>

        <div className="space-y-6">
          <AdminDataTable
            title="Top sellers"
            description="Highest revenue storefront operators from the current analytics snapshot."
            actions={<Link href="/admin/sellers" className="ui-link-muted">View sellers</Link>}
          >
            {data.analytics.topSellers.length === 0 ? (
              <div className="p-6">
                <AdminEmptyState
                  title="No seller revenue yet"
                  description="Top sellers will appear once orders are flowing through marketplace storefronts."
                />
              </div>
            ) : (
              <div className="space-y-4 p-5 sm:p-6">
                {data.analytics.topSellers.slice(0, 5).map((seller) => (
                  <div key={seller.sellerId} className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-copy-strong">{seller.storeName}</p>
                        <p className="mt-1 text-sm text-copy-muted">{seller.orderCount} marketplace orders</p>
                      </div>
                      <p className="text-sm font-semibold text-copy-strong">{formatPrice(seller.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminDataTable>

          <AdminDataTable
            title="Top products"
            description="Marketplace catalog leaders by sold quantity and revenue."
            actions={<Link href="/admin/products" className="ui-link-muted">View products</Link>}
          >
            {data.analytics.topProducts.length === 0 ? (
              <div className="p-6">
                <AdminEmptyState
                  title="No top products yet"
                  description="Best-performing products will surface here once order volume accumulates."
                />
              </div>
            ) : (
              <div className="space-y-4 p-5 sm:p-6">
                {data.analytics.topProducts.slice(0, 5).map((product) => (
                  <div key={product.productId} className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-copy-strong">{product.name}</p>
                        <p className="mt-1 text-sm text-copy-muted">{product.totalSold} units sold</p>
                      </div>
                      <p className="text-sm font-semibold text-copy-strong">{formatPrice(product.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminDataTable>
        </div>
      </div>
    </AdminSection>
  )
}
