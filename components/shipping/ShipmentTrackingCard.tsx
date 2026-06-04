import ShipmentStatusBadge from '@/components/shipping/ShipmentStatusBadge'
import TrackingNumberCopyButton from '@/components/shipping/TrackingNumberCopyButton'
import type { OrderShipment } from '@/types/shipping'
import {
  getShipmentStatusDescription,
  getShippingDeliveryTypeLabel,
  getShippingProviderLabel,
} from '@/types/shipping'

export default function ShipmentTrackingCard({
  shipment,
}: {
  shipment: OrderShipment
}) {
  const statusDescription = getShipmentStatusDescription(shipment.status)

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

      <p className="mt-3 text-sm text-copy-secondary">{statusDescription}</p>

      <dl className="mt-4 space-y-3 text-sm text-copy-secondary">
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
            {shipment.trackingNumber ?? 'Продавець готує відправлення'}
          </dd>
        </div>
      </dl>

      {shipment.trackingNumber ? (
        <div className="mt-4">
          <TrackingNumberCopyButton trackingNumber={shipment.trackingNumber} />
        </div>
      ) : null}
    </article>
  )
}
