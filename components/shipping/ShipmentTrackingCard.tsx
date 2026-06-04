import OrderShipmentCard from '@/components/shipping/OrderShipmentCard'
import type { OrderShipment } from '@/types/shipping'

export default function ShipmentTrackingCard({
  shipment,
}: {
  shipment: OrderShipment
}) {
  return <OrderShipmentCard shipment={shipment} />
}
