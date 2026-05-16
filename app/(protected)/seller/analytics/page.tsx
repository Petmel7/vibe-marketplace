import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import SellerMetricCard from '@/components/seller/SellerMetricCard'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import { formatPrice } from '@/utils/formatters/price'
import { getSellerAnalyticsPageData } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerAnalyticsPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerAnalyticsPageData(user)

  if (!data.sellerProfile) {
    redirect('/seller/store?setup=profile')
  }

  if (!data.store) {
    redirect('/seller/store?setup=store')
  }

  const pendingItems = data.orderItems.filter((item) => item.fulfillmentStatus === 'PENDING').length
  const shippedItems = data.orderItems.filter((item) => item.fulfillmentStatus === 'SHIPPED').length

  return (
    <SellerSection
      eyebrow="Analytics"
      title="Seller analytics"
      description="Track revenue direction, order flow, and top-performing products with a layout ready for future charts."
    >
      <SellerVerificationNotice
        status={data.sellerProfile.verificationStatus}
      />

      {data.analytics ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SellerMetricCard label="Revenue" value={formatPrice(data.analytics.totalRevenue)} detail={`Last 30 days: ${formatPrice(data.analytics.revenueLast30Days)}`} />
            <SellerMetricCard label="Orders" value={data.analytics.totalOrders} detail={`${pendingItems} pending fulfillment items`} />
            <SellerMetricCard label="Units sold" value={data.analytics.totalProductsSold} detail={`${shippedItems} shipped fulfillment items`} />
            <SellerMetricCard label="Tracked products" value={data.products.length} detail="Current server-loaded analytics catalog slice" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <section className="ui-elevated-panel p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-copy-strong">Revenue trend</h2>
              <p className="mt-1 text-sm text-copy-muted">
                Placeholder block prepared for a future chart library integration.
              </p>
              <div className="mt-6 grid h-72 place-items-center rounded-3xl border border-dashed border-panelBorder bg-panel text-sm text-copy-muted">
                Revenue chart placeholder
              </div>
            </section>

            <section className="ui-elevated-panel p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-copy-strong">Fulfillment summary</h2>
              <p className="mt-1 text-sm text-copy-muted">
                Operational pacing across the seller-owned order item queue.
              </p>
              <div className="mt-5 space-y-3 text-sm text-copy-secondary">
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Pending</span>
                  <span className="font-semibold text-copy-strong">{pendingItems}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Shipped</span>
                  <span className="font-semibold text-copy-strong">{shippedItems}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-panel px-4 py-3">
                  <span>Top products</span>
                  <span className="font-semibold text-copy-strong">{data.analytics.topProducts.length}</span>
                </div>
              </div>
            </section>
          </div>

          <SellerTable
            title="Top products"
            description="Revenue leaders surfaced from the seller analytics backend."
          >
            <table className="min-w-full text-sm">
              <thead className="bg-panel/60 text-left text-copy-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Units sold</th>
                  <th className="px-5 py-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.analytics.topProducts.map((product) => (
                  <tr key={product.productId} className="border-t border-panelBorder">
                    <td className="px-5 py-4 font-semibold text-copy-strong">{product.name}</td>
                    <td className="px-5 py-4 text-copy-secondary">{product.totalSold}</td>
                    <td className="px-5 py-4 text-copy-secondary">{formatPrice(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SellerTable>
        </>
      ) : (
        <EmptyState
          title="Analytics will appear after store setup"
          description="Once the storefront is connected and orders start flowing through seller operations, revenue and trend metrics will appear here."
        />
      )}
    </SellerSection>
  )
}
