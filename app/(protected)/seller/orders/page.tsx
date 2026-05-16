import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import FulfillmentStatusBadge from '@/components/seller/FulfillmentStatusBadge'
import SellerOrderActions from '@/components/seller/SellerOrderActions'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import { getCurrentUser } from '@/lib/session/getSession'
import type { SellerFulfillmentStatus } from '@/types/seller'
import { formatPrice } from '@/utils/formatters/price'
import { getSellerOrdersPageData } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerOrdersPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerOrdersPageData(user)

  if (!data.sellerProfile) {
    redirect('/seller/store?setup=profile')
  }

  if (!data.store) {
    redirect('/seller/store?setup=store')
  }

  const isReadOnly = data.sellerProfile.verificationStatus === 'SUSPENDED'

  return (
    <SellerSection
      eyebrow="Orders"
      title="Seller fulfillment queue"
      description="Handle seller-scoped line items, shipping summaries, and allowed fulfillment transitions."
    >
      <SellerVerificationNotice
        status={data.sellerProfile.verificationStatus}
      />

      <SellerTable
        title="Order items"
        description="Each row represents the seller-owned portion of a marketplace order."
      >
        {data.orderItems.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No seller orders yet"
              description="Fulfillment tasks will appear here once your storefront starts receiving marketplace purchases."
            />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-panel/60 text-left text-copy-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Snapshot</th>
                <th className="px-5 py-3 font-medium">Buyer shipping</th>
                <th className="px-5 py-3 font-medium">Timeline</th>
                <th className="px-5 py-3 font-medium">Actions</th>
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
                    <div className="mt-3">
                      <FulfillmentStatusBadge status={item.fulfillmentStatus as SellerFulfillmentStatus} />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">
                    {item.shippingAddress ? (
                      <div className="space-y-1">
                        <p className="font-medium text-copy-primary">{item.shippingAddress.fullName}</p>
                        <p>
                          {item.shippingAddress.street}, {item.shippingAddress.building}
                          {item.shippingAddress.apartment ? `, apt ${item.shippingAddress.apartment}` : ''}
                        </p>
                        <p>
                          {item.shippingAddress.city}, {item.shippingAddress.country}
                          {item.shippingAddress.zipCode ? `, ${item.shippingAddress.zipCode}` : ''}
                        </p>
                      </div>
                    ) : (
                      <p className="text-copy-muted">Shipping summary unavailable</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-copy-secondary">
                    <p>Order #{item.orderId.slice(0, 8)}</p>
                    <p className="mt-1">{new Date(item.orderCreatedAt).toLocaleDateString('uk-UA')}</p>
                    <p className="mt-1 capitalize">{item.orderStatus}</p>
                  </td>
                  <td className="px-5 py-4">
                    <SellerOrderActions
                      itemId={item.id}
                      orderStatus={item.orderStatus}
                      fulfillmentStatus={item.fulfillmentStatus as SellerFulfillmentStatus}
                      disabled={isReadOnly}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SellerTable>
    </SellerSection>
  )
}
