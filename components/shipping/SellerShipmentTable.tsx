'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import EmptyState from '@/components/profile/EmptyState'
import ShipmentStatusBadge from '@/components/shipping/ShipmentStatusBadge'
import type { SellerShipmentList } from '@/types/shipping'
import { canCreateShipmentTtn, getShipmentDestinationLabel } from '@/types/shipping'
import BulkCreateTtnDialog from './BulkCreateTtnDialog'

export default function SellerShipmentTable({
  shipments,
  isShippingConfigured,
}: {
  shipments: SellerShipmentList
  isShippingConfigured: boolean
}) {
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([])

  const eligibleShipmentIds = useMemo(
    () =>
      shipments.items
        .filter((shipment) => canCreateShipmentTtn(shipment, isShippingConfigured))
        .map((shipment) => shipment.id),
    [isShippingConfigured, shipments.items],
  )

  if (shipments.items.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title="Відправлень поки що немає"
          description="Коли покупці оформлять замовлення з Nova Poshta, тут з’являться shipment snapshots для створення ТТН."
          actionHref="/seller/orders"
          actionLabel="Перейти до замовлень"
        />
      </div>
    )
  }

  const allEligibleSelected =
    eligibleShipmentIds.length > 0 &&
    eligibleShipmentIds.every((shipmentId) => selectedShipmentIds.includes(shipmentId))

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-panelBorder bg-panel px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-copy-strong">Bulk TTN</p>
          <p className="text-sm text-copy-muted">
            Виберіть кілька shipment, готових до відправлення. Часткові помилки не зупиняють решту batch.
          </p>
        </div>
        <BulkCreateTtnDialog
          shipments={shipments.items.filter((shipment) => eligibleShipmentIds.includes(shipment.id))}
          selectedShipmentIds={selectedShipmentIds}
          onSelectionChange={setSelectedShipmentIds}
        />
      </div>

      <table className="min-w-full text-sm">
        <thead className="bg-panel/60 text-left text-copy-muted">
          <tr>
            <th className="px-5 py-3 font-medium">
              <input
                type="checkbox"
                aria-label="Вибрати всі shipment, придатні для bulk TTN"
                checked={allEligibleSelected}
                onChange={(event) => {
                  setSelectedShipmentIds(event.target.checked ? eligibleShipmentIds : [])
                }}
              />
            </th>
            <th className="px-5 py-3 font-medium">Замовлення</th>
            <th className="px-5 py-3 font-medium">Доставка</th>
            <th className="px-5 py-3 font-medium">ТТН</th>
            <th className="px-5 py-3 font-medium">Статус</th>
            <th className="px-5 py-3 font-medium">Створено</th>
            <th className="px-5 py-3 font-medium">Дії</th>
          </tr>
        </thead>
        <tbody>
          {shipments.items.map((shipment) => {
            const isEligible = eligibleShipmentIds.includes(shipment.id)
            const isSelected = selectedShipmentIds.includes(shipment.id)

            return (
              <tr key={shipment.id} className="border-t border-panelBorder align-top">
                <td className="px-5 py-4">
                  <input
                    type="checkbox"
                    aria-label={`Вибрати shipment ${shipment.id}`}
                    checked={isSelected}
                    disabled={!isEligible}
                    onChange={(event) => {
                      setSelectedShipmentIds((current) =>
                        event.target.checked
                          ? [...new Set([...current, shipment.id])]
                          : current.filter((shipmentId) => shipmentId !== shipment.id),
                      )
                    }}
                  />
                </td>
                <td className="px-5 py-4">
                  <p className="font-semibold text-copy-strong">#{shipment.orderId.slice(0, 8)}</p>
                  <p className="mt-1 text-copy-muted">{shipment.id.slice(0, 8)}</p>
                  {shipment.isReturnShipment ? (
                    <p className="mt-2 text-xs text-amber-200">Return shipment</p>
                  ) : null}
                </td>
                <td className="px-5 py-4 text-copy-secondary">
                  <p className="font-medium text-copy-primary">{shipment.recipientCityName}</p>
                  <p className="mt-1">{getShipmentDestinationLabel(shipment)}</p>
                </td>
                <td className="px-5 py-4 text-copy-secondary">
                  {shipment.trackingNumber ? (
                    <span className="font-medium text-copy-primary">{shipment.trackingNumber}</span>
                  ) : (
                    <span className="text-copy-muted">Ще не створено</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="space-y-2">
                    <ShipmentStatusBadge status={shipment.status} />
                    {shipment.status === 'FAILED' || shipment.status === 'RETURNED' ? (
                      <p className="text-xs text-amber-200">
                        {shipment.status === 'FAILED'
                          ? 'Потрібна перевірка проблеми з доставкою'
                          : 'Повернення активне або завершене'}
                      </p>
                    ) : null}
                  </div>
                </td>
                <td className="px-5 py-4 text-copy-secondary">
                  {new Date(shipment.createdAt).toLocaleDateString('uk-UA')}
                </td>
                <td className="px-5 py-4">
                  <Link href={`/seller/shipments/${shipment.id}`} className="ui-link-muted">
                    Відкрити
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
