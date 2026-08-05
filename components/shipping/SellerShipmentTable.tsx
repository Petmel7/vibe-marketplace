'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import EmptyState from '@/components/profile/EmptyState'
import ShipmentStatusBadge from '@/components/shipping/ShipmentStatusBadge'
import {
  DataTable,
  TableActionCell,
  TableCell,
  TableDateCell,
  TableEmptyState,
  TableHead,
  TableHeaderCell,
  TableMetaCell,
  TableRow,
  TableStatusCell,
} from '@/components/ui/table'
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
      <TableEmptyState>
        <EmptyState
          title="Відправлень поки що немає"
          description="Коли покупці оформлять замовлення з Nova Poshta, тут з’являться відправлення для створення ТТН."
          actionHref="/seller/orders"
          actionLabel="Перейти до замовлень"
        />
      </TableEmptyState>
    )
  }

  const allEligibleSelected =
    eligibleShipmentIds.length > 0 &&
    eligibleShipmentIds.every((shipmentId) => selectedShipmentIds.includes(shipmentId))

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-panelBorder bg-panel px-4 py-4 max-[499px]:items-stretch min-[1131px]:flex-row min-[1131px]:items-center min-[1131px]:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-copy-strong">Масове створення ТТН</p>
          <p className="text-sm text-copy-muted">
            Виберіть кілька відправлень, готових до оформлення. Часткові помилки не зупиняють решту пакета.
          </p>
        </div>
        <div className="max-[499px]:w-full min-[501px]:max-[1130px]:flex min-[501px]:max-[1130px]:justify-center">
          <BulkCreateTtnDialog
            shipments={shipments.items.filter((shipment) => eligibleShipmentIds.includes(shipment.id))}
            selectedShipmentIds={selectedShipmentIds}
            onSelectionChange={setSelectedShipmentIds}
          />
        </div>
      </div>

      <DataTable>
        <TableHead>
          <tr>
            <TableHeaderCell>
              <input
                type="checkbox"
                aria-label="Вибрати всі відправлення, придатні для масового створення ТТН"
                checked={allEligibleSelected}
                onChange={(event) => {
                  setSelectedShipmentIds(event.target.checked ? eligibleShipmentIds : [])
                }}
              />
            </TableHeaderCell>
            <TableHeaderCell>Замовлення</TableHeaderCell>
            <TableHeaderCell>Доставка</TableHeaderCell>
            <TableHeaderCell>ТТН</TableHeaderCell>
            <TableHeaderCell>Статус</TableHeaderCell>
            <TableHeaderCell>Створено</TableHeaderCell>
            <TableHeaderCell>Дії</TableHeaderCell>
          </tr>
        </TableHead>
        <tbody>
          {shipments.items.map((shipment) => {
            const isEligible = eligibleShipmentIds.includes(shipment.id)
            const isSelected = selectedShipmentIds.includes(shipment.id)

            return (
              <TableRow key={shipment.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={`Вибрати відправлення ${shipment.id}`}
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
                </TableCell>
                <TableMetaCell
                  title={`#${shipment.orderId.slice(0, 8)}`}
                  meta={shipment.id.slice(0, 8)}
                >
                  {shipment.isReturnShipment ? (
                    <p className="mt-2 text-xs text-amber-200">Зворотне відправлення</p>
                  ) : null}
                </TableMetaCell>
                <TableCell tone="secondary">
                  <p className="font-medium text-copy-primary">{shipment.recipientCityName}</p>
                  <p className="mt-1">{getShipmentDestinationLabel(shipment)}</p>
                </TableCell>
                <TableCell tone="secondary">
                  {shipment.trackingNumber ? (
                    <span className="font-medium text-copy-primary">{shipment.trackingNumber}</span>
                  ) : (
                    <span className="text-copy-muted">Ще не створено</span>
                  )}
                </TableCell>
                <TableStatusCell>
                  <div className="space-y-2">
                    <ShipmentStatusBadge status={shipment.status} />
                    {shipment.status === 'FAILED' || shipment.status === 'RETURNED' ? (
                      <p className="text-xs text-amber-200">
                        {shipment.status === 'FAILED'
                          ? 'Потрібно перевірити проблему з доставкою'
                          : 'Повернення активне або вже завершене'}
                      </p>
                    ) : null}
                  </div>
                </TableStatusCell>
                <TableDateCell value={shipment.createdAt} mode="date" />
                <TableActionCell>
                  <Link href={`/seller/shipments/${shipment.id}`} className="ui-link-muted">
                    Відкрити
                  </Link>
                </TableActionCell>
              </TableRow>
            )
          })}
        </tbody>
      </DataTable>
    </div>
  )
}
