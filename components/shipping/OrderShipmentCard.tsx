import ShipmentStatusBadge from '@/components/shipping/ShipmentStatusBadge'
import TrackingNumberCopyButton from '@/components/shipping/TrackingNumberCopyButton'
import type { OrderShipment } from '@/types/shipping'
import {
  getShipmentDestinationLabel,
  getShipmentStatusDescription,
  getShippingDeliveryTypeLabel,
  getShippingProviderLabel,
} from '@/types/shipping'
import { formatPrice } from '@/utils/formatters/price'

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

      <p className="mt-3 text-sm text-copy-secondary">
        {getShipmentStatusDescription(shipment.status)}
      </p>

      <dl className="mt-4 space-y-3 text-sm text-copy-secondary">
        <div className="flex items-start justify-between gap-4">
          <dt>Місто</dt>
          <dd className="text-right text-copy-primary">{shipment.recipientCityName}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt>{shipment.deliveryType === 'NOVA_POSHTA_COURIER' ? 'Адреса' : 'Відділення'}</dt>
          <dd className="text-right text-copy-primary">{getShipmentDestinationLabel(shipment)}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt>Трек-номер</dt>
          <dd className="text-right text-copy-primary">
            {shipment.trackingNumber ?? 'Продавець готує відправлення'}
          </dd>
        </div>
        {shipment.estimatedCost ? (
          <div className="flex items-start justify-between gap-4">
            <dt>Орієнтовна вартість</dt>
            <dd className="text-right text-copy-primary">{formatPrice(shipment.estimatedCost)}</dd>
          </div>
        ) : null}
        {shipment.isReturnShipment ? (
          <div className="flex items-start justify-between gap-4">
            <dt>Статус маршруту</dt>
            <dd className="text-right text-copy-primary">Повернення відправнику</dd>
          </div>
        ) : null}
      </dl>

      {shipment.trackingNumber ? (
        <div className="mt-4">
          <TrackingNumberCopyButton trackingNumber={shipment.trackingNumber} />
        </div>
      ) : null}
    </article>
  )
}
