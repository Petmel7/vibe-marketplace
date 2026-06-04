import Link from 'next/link'
import EmptyState from '@/components/profile/EmptyState'
import ShipmentStatusBadge from '@/components/shipping/ShipmentStatusBadge'
import type { SellerShipmentList } from '@/types/shipping'

export default function SellerShipmentTable({
  shipments,
}: {
  shipments: SellerShipmentList
}) {
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

  return (
    <table className="min-w-full text-sm">
      <thead className="bg-panel/60 text-left text-copy-muted">
        <tr>
          <th className="px-5 py-3 font-medium">Замовлення</th>
          <th className="px-5 py-3 font-medium">Доставка</th>
          <th className="px-5 py-3 font-medium">ТТН</th>
          <th className="px-5 py-3 font-medium">Статус</th>
          <th className="px-5 py-3 font-medium">Створено</th>
          <th className="px-5 py-3 font-medium">Дії</th>
        </tr>
      </thead>
      <tbody>
        {shipments.items.map((shipment) => (
          <tr key={shipment.id} className="border-t border-panelBorder align-top">
            <td className="px-5 py-4">
              <p className="font-semibold text-copy-strong">#{shipment.orderId.slice(0, 8)}</p>
              <p className="mt-1 text-copy-muted">{shipment.id.slice(0, 8)}</p>
            </td>
            <td className="px-5 py-4 text-copy-secondary">
              <p className="font-medium text-copy-primary">{shipment.recipientCityName}</p>
              <p className="mt-1">{shipment.recipientWarehouseName ?? 'Уточнюється'}</p>
            </td>
            <td className="px-5 py-4 text-copy-secondary">
              {shipment.trackingNumber ? (
                <span className="font-medium text-copy-primary">{shipment.trackingNumber}</span>
              ) : (
                <span className="text-copy-muted">Ще не створено</span>
              )}
            </td>
            <td className="px-5 py-4">
              <ShipmentStatusBadge status={shipment.status} />
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
        ))}
      </tbody>
    </table>
  )
}
