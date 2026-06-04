import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import DashboardCard from '@/components/profile/DashboardCard'
import EmptyState from '@/components/profile/EmptyState'
import ProfileSection from '@/components/profile/ProfileSection'
import StatusBadge from '@/components/profile/StatusBadge'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'
import ReportButton from '@/components/abuse-reports/ReportButton'
import DisputeFormDialog from '@/components/disputes/DisputeFormDialog'
import RefundRequestDialog from '@/components/refunds/RefundRequestDialog'
import OrderShipmentCard from '@/components/shipping/OrderShipmentCard'
import { getCurrentUser } from '@/lib/session/getSession'
import { OrderAccessError, OrderNotFoundError } from '@/lib/errors/orders'
import { formatPrice } from '@/utils/formatters/price'
import { getOrderDetailPageData } from '@/app/(protected)/profile/_lib/profile-dashboard.data'

const REFUND_ELIGIBLE_ORDER_STATUSES = new Set([
  'confirmed',
  'paid',
  'processing',
  'shipped',
  'delivered',
])

const CARD_REFUND_ELIGIBLE_PAYMENT_STATUSES = new Set([
  'SUCCEEDED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
])

function canRequestRefund(order: {
  status: string
  paymentMethod: string | null
  paymentStatus: string | null
}) {
  if (!REFUND_ELIGIBLE_ORDER_STATUSES.has(order.status)) {
    return false
  }

  if (order.paymentMethod === 'CASH_ON_DELIVERY') {
    return true
  }

  return Boolean(order.paymentStatus && CARD_REFUND_ELIGIBLE_PAYMENT_STATUSES.has(order.paymentStatus))
}

async function getOrderDetailViewState(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>, id: string) {
  try {
    const data = await getOrderDetailPageData(user, id)
    return { kind: 'success' as const, data }
  } catch (error) {
    if (error instanceof OrderNotFoundError) {
      return { kind: 'not-found' as const }
    }

    if (error instanceof OrderAccessError) {
      return { kind: 'forbidden' as const }
    }

    throw error
  }
}

export default async function ProfileOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const { id } = await params
  const viewState = await getOrderDetailViewState(user, id)

  if (viewState.kind === 'not-found') {
    notFound()
  }

  if (viewState.kind === 'forbidden') {
    return (
      <ProtectedRouteState
        title="Order access denied"
        description="This order is not available for the current buyer account."
        actionHref="/profile/orders"
        actionLabel="Back to orders"
      />
    )
  }

  const { order, shippingAddress } = viewState.data

  return (
    <ProfileSection
      eyebrow="Order details"
      title={`Order #${order.id.slice(0, 8)}`}
      description="Review fulfillment status, item details, and delivery information for this purchase."
    >
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={order.status} />
        <p className="text-sm text-copy-muted">
          Created {new Date(order.createdAt).toLocaleDateString('uk-UA')}
        </p>
        <Link href="/profile/refunds" className="ui-link-muted">
          Open refunds
        </Link>
        <ReportButton
          currentUser={user}
          targetType="ORDER"
          targetId={order.id}
          triggerLabel="Повідомити про проблему"
          title="Поскаржитися на замовлення"
        />
        <DisputeFormDialog
          orderId={order.id}
          title="Відкрити суперечку по замовленню"
          description="Опишіть проблему з усім замовленням або використайте кнопку нижче для конкретної позиції."
          triggerLabel="Відкрити суперечку"
        />
        <Link href="/profile/orders" className="ui-link-muted">
          Back to orders
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <DashboardCard
          title="Items in this order"
          description={`${order.items.length} line items across your marketplace purchase.`}
        >
          <div className="space-y-4">
            {order.items.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-4 rounded-2xl border border-panelBorder bg-panel px-4 py-4 sm:flex-row sm:items-start"
              >
                <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-panelBorder bg-white">
                  {item.imageSnapshot ? (
                    <Image
                      src={item.imageSnapshot}
                      alt={item.productNameSnapshot}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-copy-muted">
                      No image
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-copy-strong">{item.productNameSnapshot}</h2>
                      <p className="mt-1 text-sm text-copy-muted">{item.storeNameSnapshot}</p>
                    </div>
                    <p className="text-base font-semibold text-copy-strong">
                      {formatPrice(item.unitPriceSnapshot)}
                    </p>
                  </div>

                  <dl className="grid gap-2 text-sm text-copy-secondary sm:grid-cols-2">
                    <div>
                      <dt className="text-copy-muted">Quantity</dt>
                      <dd className="mt-1 text-copy-primary">{item.quantity}</dd>
                    </div>
                    <div>
                      <dt className="text-copy-muted">Variant</dt>
                      <dd className="mt-1 text-copy-primary">{item.variantSnapshot || 'Standard option'}</dd>
                    </div>
                  </dl>

                  <div className="pt-2">
                    <div className="flex flex-wrap gap-3">
                      {canRequestRefund(order) ? (
                        <RefundRequestDialog
                          orderId={order.id}
                          orderItemId={item.id}
                          productName={item.productNameSnapshot}
                          suggestedAmount={(Number(item.unitPriceSnapshot) * item.quantity).toFixed(2)}
                          triggerLabel="Запросити повернення"
                        />
                      ) : null}
                      <DisputeFormDialog
                        orderId={order.id}
                        orderItemId={item.id}
                        title="Відкрити суперечку по товару"
                        description={`Опишіть проблему саме для позиції "${item.productNameSnapshot}".`}
                        triggerLabel="Суперечка по цій позиції"
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </DashboardCard>

        <div className="space-y-6">
          <DashboardCard title="Order summary" description="A quick financial and fulfillment snapshot.">
            <dl className="space-y-3 text-sm text-copy-secondary">
              <div className="flex items-center justify-between gap-4">
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={order.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Total paid</dt>
                <dd className="text-base font-semibold text-copy-strong">{formatPrice(order.totalAmount)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Items</dt>
                <dd className="text-copy-primary">{order.items.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Placed on</dt>
                <dd className="text-copy-primary">
                  {new Date(order.createdAt).toLocaleDateString('uk-UA')}
                </dd>
              </div>
            </dl>
          </DashboardCard>

          <DashboardCard
            title="Shipping destination"
            description="Delivery information captured for this order."
          >
            {shippingAddress ? (
              <div className="space-y-2 text-sm text-copy-secondary">
                <p className="font-semibold text-copy-strong">{shippingAddress.fullName}</p>
                <p>{shippingAddress.phone}</p>
                <p>
                  {shippingAddress.street}, {shippingAddress.building}
                  {shippingAddress.apartment ? `, apt ${shippingAddress.apartment}` : ''}
                </p>
                <p>
                  {shippingAddress.city}
                  {shippingAddress.region ? `, ${shippingAddress.region}` : ''}, {shippingAddress.country}
                </p>
                {shippingAddress.zipCode ? <p>{shippingAddress.zipCode}</p> : null}
              </div>
            ) : (
              <EmptyState
                title="Shipping address unavailable"
                description="The original shipping destination is not available in your current address book."
                actionHref="/profile/addresses"
                actionLabel="Manage addresses"
              />
            )}
          </DashboardCard>

          {order.shipments.length > 0 ? (
            <DashboardCard
              title="Shipment snapshots"
              description="Per-store delivery snapshots saved during checkout."
            >
              <div className="grid gap-4">
                {order.shipments.map((shipment) => (
                  <OrderShipmentCard key={shipment.id} shipment={shipment} />
                ))}
              </div>
            </DashboardCard>
          ) : null}

          {order.note ? (
            <DashboardCard title="Order note" description="Additional delivery context attached to this order.">
              <p className="text-sm text-copy-secondary">{order.note}</p>
            </DashboardCard>
          ) : null}
        </div>
      </div>
    </ProfileSection>
  )
}
