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
import ShipmentTrackingCard from '@/components/shipping/ShipmentTrackingCard'
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
        title="Доступ до замовлення заборонено"
        description="Це замовлення недоступне для поточного акаунта покупця."
        actionHref="/profile/orders"
        actionLabel="Назад до замовлень"
      />
    )
  }

  const { order, shippingAddress } = viewState.data

  return (
    <ProfileSection
      eyebrow="Деталі замовлення"
      title={`Замовлення #${order.id.slice(0, 8)}`}
      description="Переглядайте статус виконання, товари та інформацію про доставку для цієї покупки."
    >
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={order.status} />
        <p className="text-sm text-copy-muted">
          Створено {new Date(order.createdAt).toLocaleDateString('uk-UA')}
        </p>
        <Link href="/profile/refunds" className="ui-link-muted">
          Відкрити повернення
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
          Назад до замовлень
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <DashboardCard
          title="Товари в цьому замовленні"
          description={`${order.items.length} позицій у вашій покупці на маркетплейсі.`}
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
                      Немає фото
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
                      <dt className="text-copy-muted">Кількість</dt>
                      <dd className="mt-1 text-copy-primary">{item.quantity}</dd>
                    </div>
                    <div>
                      <dt className="text-copy-muted">Варіант</dt>
                      <dd className="mt-1 text-copy-primary">{item.variantSnapshot || 'Стандартний варіант'}</dd>
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
          <DashboardCard title="Підсумок замовлення" description="Короткий фінансовий та логістичний зріз.">
            <dl className="space-y-3 text-sm text-copy-secondary">
              <div className="flex items-center justify-between gap-4">
                <dt>Статус</dt>
                <dd>
                  <StatusBadge status={order.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Сплачено</dt>
                <dd className="text-base font-semibold text-copy-strong">{formatPrice(order.totalAmount)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Позиції</dt>
                <dd className="text-copy-primary">{order.items.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Оформлено</dt>
                <dd className="text-copy-primary">
                  {new Date(order.createdAt).toLocaleDateString('uk-UA')}
                </dd>
              </div>
            </dl>
          </DashboardCard>

          <DashboardCard
            title="Адреса доставки"
            description="Інформація про доставку, зафіксована для цього замовлення."
          >
            {shippingAddress ? (
              <div className="space-y-2 text-sm text-copy-secondary">
                <p className="font-semibold text-copy-strong">{shippingAddress.fullName}</p>
                <p>{shippingAddress.phone}</p>
                <p>
                  {shippingAddress.street}, {shippingAddress.building}
                  {shippingAddress.apartment ? `, кв. ${shippingAddress.apartment}` : ''}
                </p>
                <p>
                  {shippingAddress.city}
                  {shippingAddress.region ? `, ${shippingAddress.region}` : ''}, {shippingAddress.country}
                </p>
                {shippingAddress.zipCode ? <p>{shippingAddress.zipCode}</p> : null}
              </div>
            ) : (
              <EmptyState
                title="Адреса доставки недоступна"
                description="Початковий напрямок доставки недоступний у вашій поточній адресній книзі."
                actionHref="/profile/addresses"
                actionLabel="Керувати адресами"
              />
            )}
          </DashboardCard>

          {order.shipments.length > 0 ? (
            <DashboardCard
              title="Снапшоти відправлень"
              description="Окремі снапшоти доставки по магазинах, збережені під час оформлення."
            >
              <div className="grid gap-4">
                {order.shipments.map((shipment) => (
                  <ShipmentTrackingCard key={shipment.id} shipment={shipment} />
                ))}
              </div>
            </DashboardCard>
          ) : null}

          {order.note ? (
            <DashboardCard title="Примітка до замовлення" description="Додатковий контекст доставки для цього замовлення.">
              <p className="text-sm text-copy-secondary">{order.note}</p>
            </DashboardCard>
          ) : null}
        </div>
      </div>
    </ProfileSection>
  )
}
