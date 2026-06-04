import Link from 'next/link'
import CreateTtnButton from '@/components/shipping/CreateTtnButton'
import CancelShipmentButton from '@/components/shipping/CancelShipmentButton'
import RefreshShipmentStatusButton from '@/components/shipping/RefreshShipmentStatusButton'
import ShipmentStatusBadge from '@/components/shipping/ShipmentStatusBadge'
import TrackingNumberCopyButton from '@/components/shipping/TrackingNumberCopyButton'
import type { SellerShipment, StoreShippingSettings } from '@/types/shipping'
import {
  canCancelShipment,
  canCreateShipmentTtn,
  canRefreshShipmentStatus,
  getShipmentStatusDescription,
  getShippingDeliveryTypeLabel,
  getShippingProviderLabel,
} from '@/types/shipping'
import { formatPrice } from '@/utils/formatters/price'

function getCreateTtnDisabledReason(shipment: SellerShipment, shippingSettings: StoreShippingSettings | null) {
  if (!shippingSettings?.isConfigured) {
    return 'Налаштуйте дані відправника магазину перед створенням ТТН.'
  }

  if (shipment.trackingNumber || shipment.providerShipmentId) {
    return 'Для цього відправлення ТТН уже створено.'
  }

  if (shipment.status !== 'PENDING' && shipment.status !== 'READY_TO_SHIP') {
    return 'Поточний статус відправлення не дозволяє створити ТТН.'
  }

  return null
}

export default function SellerShipmentDetail({
  shipment,
  shippingSettings,
}: {
  shipment: SellerShipment
  shippingSettings: StoreShippingSettings | null
}) {
  const createTtnDisabledReason = getCreateTtnDisabledReason(shipment, shippingSettings)

  return (
    <div className="space-y-6">
      <section className="ui-elevated-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-copy-muted">Shipment</p>
            <h2 className="text-2xl font-semibold text-copy-strong">#{shipment.id.slice(0, 8)}</h2>
            <p className="text-sm text-copy-secondary">
              {getShippingProviderLabel(shipment.provider)} · {getShippingDeliveryTypeLabel(shipment.deliveryType)}
            </p>
            <p className="text-sm text-copy-secondary">{getShipmentStatusDescription(shipment.status)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ShipmentStatusBadge status={shipment.status} />
            {shipment.trackingNumber ? (
              <TrackingNumberCopyButton trackingNumber={shipment.trackingNumber} />
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <CreateTtnButton
            shipmentId={shipment.id}
            disabled={!canCreateShipmentTtn(shipment, Boolean(shippingSettings?.isConfigured))}
            disabledReason={createTtnDisabledReason}
          />
          <RefreshShipmentStatusButton
            shipmentId={shipment.id}
            disabled={!canRefreshShipmentStatus(shipment)}
          />
          <CancelShipmentButton
            shipmentId={shipment.id}
            disabled={!canCancelShipment(shipment)}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="ui-elevated-panel p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-copy-strong">Позиції у відправленні</h3>
          <div className="mt-4 space-y-3">
            {shipment.items.map((item) => (
              <article key={item.orderItemId} className="rounded-2xl border border-panelBorder bg-panel px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-copy-strong">{item.productNameSnapshot}</p>
                    <p className="mt-1 text-sm text-copy-muted">Order item #{item.orderItemId.slice(0, 8)}</p>
                  </div>
                  <div className="text-sm text-copy-secondary">
                    <p>{item.quantity} шт.</p>
                    <p className="mt-1">Fulfillment: {item.fulfillmentStatus}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="ui-elevated-panel p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-copy-strong">Снімок доставки</h3>
            <dl className="mt-4 space-y-3 text-sm text-copy-secondary">
              <div className="flex items-start justify-between gap-4">
                <dt>Отримувач</dt>
                <dd className="text-right text-copy-primary">{shipment.recipientName}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt>Телефон</dt>
                <dd className="text-right text-copy-primary">{shipment.recipientPhone}</dd>
              </div>
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
                <dt>ТТН</dt>
                <dd className="text-right text-copy-primary">
                  {shipment.trackingNumber ?? 'Ще не створено'}
                </dd>
              </div>
              {shipment.estimatedCost ? (
                <div className="flex items-start justify-between gap-4">
                  <dt>Орієнтовна вартість</dt>
                  <dd className="text-right text-copy-primary">
                    {formatPrice(shipment.estimatedCost)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="ui-elevated-panel p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-copy-strong">Налаштування відправника</h3>
                <p className="mt-1 text-sm text-copy-muted">
                  Ці дані продавця використовуються для створення ТТН Nova Poshta.
                </p>
              </div>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                  shippingSettings?.isConfigured
                    ? 'border-brand-success/30 bg-brand-success/10 text-brand-success'
                    : 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                }`}
              >
                {shippingSettings?.isConfigured ? 'Налаштовано' : 'Не налаштовано'}
              </span>
            </div>

            {shippingSettings ? (
              <dl className="mt-4 space-y-3 text-sm text-copy-secondary">
                <div className="flex items-start justify-between gap-4">
                  <dt>Відправник</dt>
                  <dd className="text-right text-copy-primary">{shippingSettings.senderName ?? '—'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt>Телефон</dt>
                  <dd className="text-right text-copy-primary">{shippingSettings.senderPhone ?? '—'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt>Місто</dt>
                  <dd className="text-right text-copy-primary">{shippingSettings.senderCityName ?? '—'}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt>Відділення</dt>
                  <dd className="text-right text-copy-primary">{shippingSettings.senderWarehouseName ?? '—'}</dd>
                </div>
              </dl>
            ) : null}

            <div className="mt-4">
              <Link href="/seller/store" className="ui-secondary-button">
                Відкрити налаштування магазину
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
