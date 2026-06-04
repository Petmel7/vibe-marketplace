import type { OrderDetailDto } from '@/features/orders/orders.dto'
import type {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from '@/types/payments'
import type { OrderShipment } from '@/types/shipping'

export type CheckoutOrderItem = {
  id: string
  productNameSnapshot: string
  variantSnapshot: string | null
  imageSnapshot: string | null
  storeNameSnapshot: string
  unitPriceSnapshot: string
  quantity: number
}

export type CheckoutOrderDetail = {
  id: string
  status: string
  totalAmount: string
  shippingAddressId: string | null
  note: string | null
  createdAt: string
  paymentId: string | null
  paymentProvider: PaymentProvider | null
  paymentMethod: PaymentMethod | null
  paymentStatus: PaymentStatus | null
  paidAt: string | null
  items: CheckoutOrderItem[]
  shipments: OrderShipment[]
}

export function toCheckoutOrderDetail(order: OrderDetailDto): CheckoutOrderDetail {
  return {
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
    shippingAddressId: order.shippingAddressId,
    note: order.note,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt),
    paymentId: order.paymentId,
    paymentProvider: order.paymentProvider,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paidAt: order.paidAt,
    shipments: order.shipments.map((shipment) => ({
      id: shipment.id,
      provider: shipment.provider,
      deliveryType: shipment.deliveryType,
      status: shipment.status,
      recipientCityRef: shipment.recipientCityRef,
      recipientCityName: shipment.recipientCityName,
      recipientStreet: shipment.recipientStreet,
      recipientBuilding: shipment.recipientBuilding,
      recipientApartment: shipment.recipientApartment,
      recipientWarehouseRef: shipment.recipientWarehouseRef,
      recipientWarehouseName: shipment.recipientWarehouseName,
      trackingNumber: shipment.trackingNumber,
      isReturnShipment: shipment.isReturnShipment,
      originalShipmentId: shipment.originalShipmentId,
    })),
    items: order.items.map((item) => ({
      id: item.id,
      productNameSnapshot: item.productNameSnapshot,
      variantSnapshot: item.variantSnapshot,
      imageSnapshot: item.imageSnapshot,
      storeNameSnapshot: item.storeNameSnapshot,
      unitPriceSnapshot: item.unitPriceSnapshot,
      quantity: item.quantity,
    })),
  }
}

export function isPaidOrderStatus(status: string | null | undefined) {
  return status === 'paid'
}

export function isSuccessfulPaymentStatus(status: PaymentStatus | null | undefined) {
  return status === 'SUCCEEDED'
}

export function isFailedPaymentStatus(status: PaymentStatus | null | undefined) {
  return status === 'FAILED' || status === 'CANCELLED'
}
