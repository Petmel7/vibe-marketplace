import Link from 'next/link'
import { redirect } from 'next/navigation'
import EmptyState from '@/components/profile/EmptyState'
import FulfillmentStatusBadge from '@/components/seller/FulfillmentStatusBadge'
import SellerOrderActions from '@/components/seller/SellerOrderActions'
import SellerSection from '@/components/seller/SellerSection'
import SellerTable from '@/components/seller/SellerTable'
import SellerVerificationNotice from '@/components/seller/SellerVerificationNotice'
import ShipmentStatusBadge from '@/components/shipping/ShipmentStatusBadge'
import {
  DataTable,
  TableActionCell,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableMetaCell,
  TableRow,
  TableStatusCell,
} from '@/components/ui/table'
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
      eyebrow="Замовлення"
      title="Черга виконання замовлень"
      description="Керуйте позиціями замовлень вашого магазину, зведеннями доставки та доступними статусами виконання."
    >
      <SellerVerificationNotice status={sellerProfile.verificationStatus} />

      <SellerTable
        title="Позиції замовлень"
        description="Кожен рядок відображає частину маркетплейс-замовлення, яка належить вашому магазину."
      >
        {data.orderItems.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Замовлень продавця ще немає"
              description="Щойно ваша вітрина почне отримувати покупки, тут з’являться задачі на виконання."
            />
          </div>
        ) : (
          <DataTable>
            <TableHead>
              <tr>
                <TableHeaderCell>Позиція</TableHeaderCell>
                <TableHeaderCell>Доставка покупця</TableHeaderCell>
                <TableHeaderCell>Хронологія</TableHeaderCell>
                <TableHeaderCell>Відправлення</TableHeaderCell>
                <TableHeaderCell>Дії</TableHeaderCell>
              </tr>
            </TableHead>
            <tbody>
              {data.orderItems.map((item) => (
                <TableRow key={item.id}>
                  <TableMetaCell
                    title={item.productNameSnapshot}
                    meta={item.variantSnapshot || 'Базовий варіант'}
                  >
                    <p className="mt-1 text-copy-secondary">
                      {item.quantity} шт. · {formatPrice(item.unitPriceSnapshot)}
                    </p>
                    <div className="mt-3">
                      <FulfillmentStatusBadge status={item.fulfillmentStatus as SellerFulfillmentStatus} />
                    </div>
                  </TableMetaCell>
                  <TableCell tone="secondary">
                    {item.shippingAddress ? (
                      <div className="space-y-1">
                        <p className="font-medium text-copy-primary">{item.shippingAddress.fullName}</p>
                        <p>
                          {item.shippingAddress.street}, {item.shippingAddress.building}
                          {item.shippingAddress.apartment ? `, кв. ${item.shippingAddress.apartment}` : ''}
                        </p>
                        <p>
                          {item.shippingAddress.city}, {item.shippingAddress.country}
                          {item.shippingAddress.zipCode ? `, ${item.shippingAddress.zipCode}` : ''}
                        </p>
                      </div>
                    ) : (
                      <p className="text-copy-muted">Дані про доставку недоступні</p>
                    )}
                  </TableCell>
                  <TableCell tone="secondary">
                    <p>Замовлення #{item.orderId.slice(0, 8)}</p>
                    <p className="mt-1">{new Date(item.orderCreatedAt).toLocaleDateString('uk-UA')}</p>
                    <p className="mt-1 capitalize">{item.orderStatus}</p>
                  </TableCell>
                  <TableStatusCell>
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
                          {item.shipment.trackingNumber ? 'Відкрити відправлення' : 'Створити ТТН'}
                        </Link>
                      </div>
                    ) : (
                      <p className="text-copy-muted">Дані про відправлення недоступні</p>
                    )}
                  </TableStatusCell>
                  <TableActionCell>
                    <SellerOrderActions
                      itemId={item.id}
                      orderStatus={item.orderStatus}
                      fulfillmentStatus={item.fulfillmentStatus as SellerFulfillmentStatus}
                      disabled={isReadOnly}
                    />
                  </TableActionCell>
                </TableRow>
              ))}
            </tbody>
          </DataTable>
        )}
      </SellerTable>

      <div className="flex flex-wrap gap-3 min-[500px]:justify-center max-[499px]:flex-col max-[499px]:[&>*]:w-full">
        <Link href="/seller/refunds" className="ui-secondary-button">
          Відкрити центр повернень
        </Link>
      </div>
    </SellerSection>
  )
}
