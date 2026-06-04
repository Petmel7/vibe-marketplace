import Link from 'next/link'
import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import FulfillmentStatusBadge from '@/components/seller/FulfillmentStatusBadge'
import SellerOrderActions from '@/components/seller/SellerOrderActions'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import ShipmentStatusBadge from '@/components/shipping/ShipmentStatusBadge'
import { getCurrentUser } from '@/lib/session/getSession'
import type { SellerFulfillmentStatus } from '@/types/seller'
import type { ShipmentStatus } from '@/types/shipping'
import { formatPrice } from '@/utils/formatters/price'
import { getSellerOrdersPageData, getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerOrdersPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerOrdersPageData(user)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!
  const isReadOnly = sellerProfile.verificationStatus === 'SUSPENDED'

  return (
    <SellerSection
      eyebrow="Orders"
      title="Seller fulfillment queue"
      description="Handle seller-scoped line items, shipping summaries, and allowed fulfillment transitions."
    >
      <SellerVerificationNotice
        status={sellerProfile.verificationStatus}
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
                <th className="px-5 py-3 font-medium">Shipment</th>
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
                  <td className="px-5 py-4 text-copy-secondary">
                    {item.shipment ? (
                      <div className="space-y-2">
                        <ShipmentStatusBadge status={item.shipment.status as ShipmentStatus} />
                        <p className="text-copy-primary">
                          {item.shipment.trackingNumber ?? 'ТТН ще не створено'}
                        </p>
                        <p>
                          {item.shipment.recipientCityName}
                          {item.shipment.recipientWarehouseName
                            ? ` · ${item.shipment.recipientWarehouseName}`
                            : ''}
                        </p>
                        <Link href={`/seller/shipments/${item.shipment.id}`} className="ui-link-muted">
                          {item.shipment.trackingNumber ? 'Відкрити shipment' : 'Створити ТТН'}
                        </Link>
                      </div>
                    ) : (
                      <p className="text-copy-muted">Shipment snapshot unavailable</p>
                    )}
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

      <div className="flex flex-wrap gap-3">
        <Link href="/seller/refunds" className="ui-secondary-button">
          Open refund center
        </Link>
      </div>
    </SellerSection>
  )
}
