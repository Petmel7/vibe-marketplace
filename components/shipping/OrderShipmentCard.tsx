import ShipmentStatusBadge from '@/components/shipping/ShipmentStatusBadge'
import type { OrderShipment } from '@/types/shipping'
import {
  getShippingDeliveryTypeLabel,
  getShippingProviderLabel,
} from '@/types/shipping'

export default function OrderShipmentCard({
  shipment,
}: {
  shipment: OrderShipment
}) {
  return (
    <article className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-copy-strong">
            {getShippingProviderLabel(shipment.provider)} · {shipment.id.slice(0, 8)}
          </h3>
          <p className="text-sm text-copy-muted">
            {getShippingDeliveryTypeLabel(shipment.deliveryType)}
          </p>
        </div>
        <ShipmentStatusBadge status={shipment.status} />
      </div>

      <dl className="space-y-3 text-sm text-copy-secondary">
        <div className="flex items-start justify-between gap-4">
          <dt>Місто</dt>
          <dd className="text-right text-copy-primary">{shipment.recipientCityName}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt>Відділення</dt>
          <dd className="text-right text-copy-primary">
            {shipment.recipientWarehouseName ?? 'Уточнюється'}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt>Трек-номер</dt>
          <dd className="text-right text-copy-primary">
            {shipment.trackingNumber ?? 'Буде доступний після створення ТТН'}
          </dd>
        </div>
      </dl>
    </article>
  )
}
