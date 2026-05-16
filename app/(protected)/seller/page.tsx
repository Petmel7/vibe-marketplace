import Link from 'next/link'
import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import FulfillmentStatusBadge from '@/components/seller/FulfillmentStatusBadge'
import ProductStatusBadge from '@/components/seller/ProductStatusBadge'
import SellerMetricCard from '@/components/seller/SellerMetricCard'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import type { SellerFulfillmentStatus } from '@/types/seller'
import { formatPrice } from '@/utils/formatters/price'
import { getSellerOverviewData } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerOverviewPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerOverviewData(user)

  if (!data.sellerProfile) {
    redirect('/seller/store?setup=profile')
  }

  if (!data.store) {
    redirect('/seller/store?setup=store')
  }

  const processingCount = data.orderItems.filter((item) => item.fulfillmentStatus === 'PROCESSING').length
  const shippedCount = data.orderItems.filter((item) => item.fulfillmentStatus === 'SHIPPED').length
  const deliveredCount = data.orderItems.filter((item) => item.fulfillmentStatus === 'DELIVERED').length

  return (
    <SellerSection
      eyebrow="Overview"
      title="Seller dashboard"
      description="Monitor revenue, fulfillment, catalog health, and store readiness from one operational workspace."
    >
      <SellerVerificationNotice
        status={data.sellerProfile.verificationStatus}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SellerMetricCard
          label="Total revenue"
          value={data.analytics ? formatPrice(data.analytics.totalRevenue) : '—'}
          detail={
            data.analytics
              ? `Last 30 days: ${formatPrice(data.analytics.revenueLast30Days)}`
              : 'Store analytics will appear once your storefront is connected.'
          }
        />
        <SellerMetricCard
          label="Orders"
          value={data.analytics?.totalOrders ?? 0}
          detail={`${processingCount} processing · ${shippedCount} shipped`}
        />
        <SellerMetricCard
          label="Products sold"
          value={data.analytics?.totalProductsSold ?? 0}
          detail={`${data.productSummaries.length} active dashboard items loaded`}
        />
        <SellerMetricCard
          label="Low stock"
          value={data.lowStockProducts.length}
          detail={
            deliveredCount > 0
              ? `${deliveredCount} delivered order items tracked`
              : 'No completed fulfillment snapshots yet'
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <SellerTable
          title="Recent fulfillment items"
          description="Seller-scoped line items with the next operational step."
        >
          {data.orderItems.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No seller orders yet"
                description="Order items connected to your storefront will appear here as soon as buyers start checking out."
              />
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-panel/60 text-left text-copy-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Item</th>
                  <th className="px-5 py-3 font-medium">Buyer shipping</th>
                  <th className="px-5 py-3 font-medium">Fulfillment</th>
                </tr>
              </thead>
              <tbody>
                {data.orderItems.map((item) => (
                  <tr key={item.id} className="border-t border-panelBorder align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-copy-strong">{item.productNameSnapshot}</p>
                      <p className="mt-1 text-copy-muted">{item.variantSnapshot || 'Default option'}</p>
                      <p className="mt-1 text-copy-secondary">
                        {item.quantity} units · {formatPrice(item.unitPriceSnapshot)}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-copy-secondary">
                      {item.shippingAddress ? (
                        <>
                          <p className="font-medium text-copy-primary">{item.shippingAddress.fullName}</p>
                          <p>
                            {item.shippingAddress.city}, {item.shippingAddress.country}
                          </p>
                        </>
                      ) : (
                        <p className="text-copy-muted">Address unavailable</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <FulfillmentStatusBadge status={item.fulfillmentStatus as SellerFulfillmentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SellerTable>

        <div className="space-y-6">
          <section className="ui-elevated-panel p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-copy-strong">Top products</h2>
                <p className="mt-1 text-sm text-copy-muted">
                  Best performers by sold quantity and storefront revenue.
                </p>
              </div>
              <Link href="/seller/products" className="ui-link-muted">
                Manage catalog
              </Link>
            </div>
            {data.topProducts.length === 0 ? (
              <EmptyState
                title="No top products yet"
                description="As your first orders come in, the strongest performers will surface here automatically."
              />
            ) : (
              <div className="mt-5 space-y-4">
                {data.topProducts.map((product) => (
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
          </section>

          <section className="ui-elevated-panel p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-copy-strong">Catalog health</h2>
                <p className="mt-1 text-sm text-copy-muted">
                  Moderation and inventory snapshots across your loaded products.
                </p>
              </div>
              <Link href="/seller/inventory" className="ui-link-muted">
                Open inventory
              </Link>
            </div>
            {data.productSummaries.length === 0 ? (
              <EmptyState
                title="No products created yet"
                description="Start your catalog with a first draft product and variant set."
                actionHref="/seller/products/new"
                actionLabel="Create product"
              />
            ) : (
              <div className="mt-5 space-y-4">
                {data.productSummaries.slice(0, 4).map((product) => (
                  <div key={product.id} className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-copy-strong">{product.name}</p>
                        <p className="mt-1 text-sm text-copy-secondary">
                          {formatPrice(product.price)} · {product.totalStock} units
                        </p>
                      </div>
                      <ProductStatusBadge status={product.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </SellerSection>
  )
}
