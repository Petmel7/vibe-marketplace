import Link from 'next/link'
import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import FulfillmentStatusBadge from '@/components/seller/FulfillmentStatusBadge'
import ProductStatusBadge from '@/components/seller/ProductStatusBadge'
import SellerMetricCard from '@/components/seller/SellerMetricCard'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import ShipmentStatusBadge from '@/components/shipping/ShipmentStatusBadge'
import { getCurrentUser } from '@/lib/session/getSession'
import type { SellerFulfillmentStatus } from '@/types/seller'
import type { ShipmentStatus } from '@/types/shipping'
import { formatPrice } from '@/utils/formatters/price'
import { getSellerOverviewData, getSellerWorkspaceRedirect } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerOverviewPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerOverviewData(user)
  const onboardingRedirect = getSellerWorkspaceRedirect(data)

  if (onboardingRedirect) {
    redirect(onboardingRedirect)
  }

  const sellerProfile = data.sellerProfile!

  const processingCount = data.orderItems.filter((item) => item.fulfillmentStatus === 'PROCESSING').length
  const shippedCount = data.orderItems.filter((item) => item.fulfillmentStatus === 'SHIPPED').length
  const deliveredCount = data.orderItems.filter((item) => item.fulfillmentStatus === 'DELIVERED').length

  return (
    <SellerSection
      eyebrow="Огляд"
      title="Кабінет продавця"
      description="Стежте за виручкою, виконанням замовлень, станом каталогу та готовністю магазину в одному робочому просторі."
    >
      <SellerVerificationNotice
        status={sellerProfile.verificationStatus}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SellerMetricCard
          label="Загальна виручка"
          value={data.analytics ? formatPrice(data.analytics.totalRevenue) : '—'}
          detail={
            data.analytics
              ? `Останні 30 днів: ${formatPrice(data.analytics.revenueLast30Days)}`
              : 'Аналітика магазину з’явиться, щойно вашу вітрину буде підключено.'
          }
        />
        <SellerMetricCard
          label="Замовлення"
          value={data.analytics?.totalOrders ?? 0}
          detail={`${processingCount} в обробці · ${shippedCount} відправлено`}
        />
        <SellerMetricCard
          label="Продано товарів"
          value={data.analytics?.totalProductsSold ?? 0}
          detail={`${data.productSummaries.length} активних позицій завантажено на дашборд`}
        />
        <SellerMetricCard
          label="Малий залишок"
          value={data.lowStockProducts.length}
          detail={
            deliveredCount > 0
              ? `${deliveredCount} доставлених позицій відстежується`
              : 'Ще немає завершених відправлень'
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <SellerTable
          title="Останні позиції для виконання"
          description="Позиції замовлень вашого магазину з наступною операційною дією."
        >
          {data.orderItems.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Замовлень продавця ще немає"
                description="Позиції замовлень, пов’язані з вашим магазином, з’являться тут, щойно покупці почнуть оформлювати покупки."
              />
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-panel/60 text-left text-copy-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Товар</th>
                  <th className="px-5 py-3 font-medium">Доставка покупця</th>
                  <th className="px-5 py-3 font-medium">Відправлення</th>
                  <th className="px-5 py-3 font-medium">Виконання</th>
                </tr>
              </thead>
              <tbody>
                {data.orderItems.map((item) => (
                  <tr key={item.id} className="border-t border-panelBorder align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-copy-strong">{item.productNameSnapshot}</p>
                      <p className="mt-1 text-copy-muted">{item.variantSnapshot || 'Базовий варіант'}</p>
                      <p className="mt-1 text-copy-secondary">
                        {item.quantity} шт. · {formatPrice(item.unitPriceSnapshot)}
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
                        <p className="text-copy-muted">Адреса недоступна</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-copy-secondary">
                      {item.shipment ? (
                        <div className="space-y-2">
                          <ShipmentStatusBadge status={item.shipment.status as ShipmentStatus} />
                          <p className="text-copy-primary">
                            {item.shipment.trackingNumber ?? 'ТТН ще не створено'}
                          </p>
                          <Link href={`/seller/shipments/${item.shipment.id}`} className="ui-link-muted">
                            {item.shipment.trackingNumber ? 'Відкрити відправлення' : 'Підготувати відправлення'}
                          </Link>
                        </div>
                      ) : (
                        <p className="text-copy-muted">Відправлення недоступне</p>
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
                <h2 className="text-lg font-semibold text-copy-strong">Топові товари</h2>
                <p className="mt-1 text-sm text-copy-muted">
                  Найкращі позиції за кількістю продажів і виручкою магазину.
                </p>
              </div>
              <Link href="/seller/products" className="ui-link-muted">
                Керувати каталогом
              </Link>
            </div>
            {data.topProducts.length === 0 ? (
              <EmptyState
                title="Топових товарів ще немає"
                description="Щойно з’являться перші замовлення, найсильніші позиції автоматично відобразяться тут."
              />
            ) : (
              <div className="mt-5 space-y-4">
                {data.topProducts.map((product) => (
                  <div key={product.productId} className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-copy-strong">{product.name}</p>
                        <p className="mt-1 text-sm text-copy-muted">{product.totalSold} шт. продано</p>
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
                <h2 className="text-lg font-semibold text-copy-strong">Стан каталогу</h2>
                <p className="mt-1 text-sm text-copy-muted">
                  Зріз модерації та залишків по ваших завантажених товарах.
                </p>
              </div>
              <Link href="/seller/inventory" className="ui-link-muted">
                Відкрити склад
              </Link>
            </div>
            {data.productSummaries.length === 0 ? (
              <EmptyState
                title="Товарів ще не створено"
                description="Почніть каталог із першої чернетки товару та набору варіантів."
                actionHref="/seller/products/new"
                actionLabel="Створити товар"
              />
            ) : (
              <div className="mt-5 space-y-4">
                {data.productSummaries.slice(0, 4).map((product) => (
                  <div key={product.id} className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-copy-strong">{product.name}</p>
                        <p className="mt-1 text-sm text-copy-secondary">
                          {formatPrice(product.price)} · {product.totalStock} шт.
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
