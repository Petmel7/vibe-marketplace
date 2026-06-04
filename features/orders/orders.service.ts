import type {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  PromotionDiscountType,
  PromotionOwnerType,
  ShipmentStatus,
  ShippingDeliveryType,
  ShippingProvider,
} from '@/app/generated/prisma/client'
import { requireBuyer, requireSeller, requireAdmin } from '@/lib/auth/guards'
import { assertOrderOwner } from '@/lib/auth/orderGuards'
import { OrderNotFoundError, InvalidStatusTransitionError } from '@/lib/errors/orders'
import type { SessionUser } from '@/features/auth/auth.dto'
import type {
  OrderSummaryDto,
  OrderDetailDto,
  OrderItemDto,
  SellerOrderItemDto,
  OrderFilterInput,
} from './orders.dto'
import {
  findOrdersByUserId,
  findOrderById,
  findStoreByOwnerId,
  findOrdersByStoreId,
  findAllOrders,
  updateOrderStatus,
} from './orders.repository'
import { emitOrderConfirmedEmailEvent } from '@/features/email/events/email.events'
import { logError } from '@/utils/logger'

// ---------------------------------------------------------------------------
// Status transition table
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['paid', 'cancelled'],
  paid:       ['processing', 'refunded'],
  processing: ['shipped'],
  shipped:    ['delivered'],
  delivered:  [],
  cancelled:  [],
  refunded:   [],
}

// ---------------------------------------------------------------------------
// DTO mappers
// ---------------------------------------------------------------------------

function toOrderPaymentSummaryDto(order: {
  payments?: Array<{
    id: string
    provider: PaymentProvider
    method: PaymentMethod
    status: PaymentStatus
    paidAt: Date | null
  }>
}): {
  paymentId: string | null
  paymentProvider: PaymentProvider | null
  paymentMethod: PaymentMethod | null
  paymentStatus: PaymentStatus | null
  paidAt: string | null
} {
  const payment = order.payments?.[0] ?? null

  return {
    paymentId: payment?.id ?? null,
    paymentProvider: payment?.provider ?? null,
    paymentMethod: payment?.method ?? null,
    paymentStatus: payment?.status ?? null,
    paidAt: payment?.paidAt?.toISOString() ?? null,
  }
}

function toOrderPromotionSummaryDto(order: {
  orderPromotion?: {
    promotionId: string
    promotionCode: string
    ownerType: PromotionOwnerType
    storeId: string | null
    promotionName: string | null
    discountType: PromotionDiscountType
    discountValue: { toString(): string }
    discountAmount: { toString(): string }
  } | null
}) {
  const promotion = order.orderPromotion ?? null

  if (!promotion) {
    return null
  }

  return {
    promotionId: promotion.promotionId,
    promotionCode: promotion.promotionCode,
    ownerType: promotion.ownerType,
    storeId: promotion.storeId,
    promotionName: promotion.promotionName,
    discountType: promotion.discountType,
    discountValue: promotion.discountValue.toString(),
    discountAmount: promotion.discountAmount.toString(),
  }
}

function toOrderItemDto(item: {
  id: string
  productNameSnapshot: string
  variantSnapshot: string | null
  imageSnapshot: string | null
  storeNameSnapshot: string
  unitPriceSnapshot: { toString(): string }
  quantity: number
}): OrderItemDto {
  return {
    id: item.id,
    productNameSnapshot: item.productNameSnapshot,
    variantSnapshot: item.variantSnapshot,
    imageSnapshot: item.imageSnapshot,
    storeNameSnapshot: item.storeNameSnapshot,
    unitPriceSnapshot: item.unitPriceSnapshot.toString(),
    quantity: item.quantity,
  }
}

function toOrderSummaryDto(order: {
  id: string
  status: string
  totalAmount: { toString(): string }
  createdAt: Date
  orderPromotion?: {
    promotionId: string
    promotionCode: string
    ownerType: PromotionOwnerType
    storeId: string | null
    promotionName: string | null
    discountType: PromotionDiscountType
    discountValue: { toString(): string }
    discountAmount: { toString(): string }
  } | null
  payments?: Array<{
    id: string
    provider: PaymentProvider
    method: PaymentMethod
    status: PaymentStatus
    paidAt: Date | null
  }>
  items: Array<{
    quantity: number
    storeNameSnapshot: string
  }>
}): OrderSummaryDto {
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0)
  const storeNames = [...new Set(order.items.map((i) => i.storeNameSnapshot))]
  return {
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount.toString(),
    itemCount,
    createdAt: order.createdAt,
    storeNames,
    promotion: toOrderPromotionSummaryDto(order),
    ...toOrderPaymentSummaryDto(order),
  }
}

function toOrderShipmentSummaryDto(shipment: {
  id: string
  provider: ShippingProvider
  deliveryType: ShippingDeliveryType
  status: ShipmentStatus
  recipientCityRef: string
  recipientCityName: string
  recipientStreet: string | null
  recipientBuilding: string | null
  recipientApartment: string | null
  recipientWarehouseRef: string | null
  recipientWarehouseName: string | null
  trackingNumber: string | null
  isReturnShipment: boolean
  originalShipmentId: string | null
}) {
  return {
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
  }
}

function toOrderDetailDto(order: {
  id: string
  status: string
  totalAmount: { toString(): string }
  shippingAddressId: string | null
  note: string | null
  createdAt: Date
  shipments: Array<{
    id: string
    provider: ShippingProvider
    deliveryType: ShippingDeliveryType
    status: ShipmentStatus
    recipientCityRef: string
    recipientCityName: string
    recipientStreet: string | null
    recipientBuilding: string | null
    recipientApartment: string | null
    recipientWarehouseRef: string | null
    recipientWarehouseName: string | null
    trackingNumber: string | null
    isReturnShipment: boolean
    originalShipmentId: string | null
  }>
  orderPromotion?: {
    promotionId: string
    promotionCode: string
    ownerType: PromotionOwnerType
    storeId: string | null
    promotionName: string | null
    discountType: PromotionDiscountType
    discountValue: { toString(): string }
    discountAmount: { toString(): string }
  } | null
  payments?: Array<{
    id: string
    provider: PaymentProvider
    method: PaymentMethod
    status: PaymentStatus
    paidAt: Date | null
  }>
  items: Array<{
    id: string
    productNameSnapshot: string
    variantSnapshot: string | null
    imageSnapshot: string | null
    storeNameSnapshot: string
    unitPriceSnapshot: { toString(): string }
    quantity: number
  }>
}): OrderDetailDto {
  return {
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount.toString(),
    shippingAddressId: order.shippingAddressId,
    note: order.note,
    createdAt: order.createdAt,
    items: order.items.map(toOrderItemDto),
    shipments: order.shipments.map(toOrderShipmentSummaryDto),
    promotion: toOrderPromotionSummaryDto(order),
    ...toOrderPaymentSummaryDto(order),
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getMyOrders(
  user: SessionUser,
  filters: OrderFilterInput,
): Promise<OrderSummaryDto[]> {
  requireBuyer(user)
  const orders = await findOrdersByUserId(user.id, filters)
  return orders.map(toOrderSummaryDto)
}

export async function getMyOrderById(
  user: SessionUser,
  orderId: string,
): Promise<OrderDetailDto> {
  requireBuyer(user)
  const order = await findOrderById(orderId)
  if (!order) throw new OrderNotFoundError()
  assertOrderOwner(user, order)
  return toOrderDetailDto(order)
}

export async function getSellerOrderItems(
  user: SessionUser,
  filters: OrderFilterInput,
): Promise<SellerOrderItemDto[]> {
  requireSeller(user)
  const store = await findStoreByOwnerId(user.id)
  if (!store) return []

  const items = await findOrdersByStoreId(store.id, filters)
  return items.map((item) => ({
    id: item.id,
    orderId: item.orderId,
    productNameSnapshot: item.productNameSnapshot,
    variantSnapshot: item.variantSnapshot,
    quantity: item.quantity,
    unitPriceSnapshot: item.unitPriceSnapshot.toString(),
    orderStatus: item.order.status,
    orderCreatedAt: item.order.createdAt,
  }))
}

export async function getAllOrders(
  user: SessionUser,
  filters: OrderFilterInput,
): Promise<OrderSummaryDto[]> {
  requireAdmin(user)
  const orders = await findAllOrders(filters)
  return orders.map(toOrderSummaryDto)
}

export async function updateStatus(
  user: SessionUser,
  orderId: string,
  newStatus: string,
): Promise<OrderDetailDto> {
  requireAdmin(user)

  const order = await findOrderById(orderId)
  if (!order) throw new OrderNotFoundError()

  const currentStatus = order.status as string
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? []
  if (!allowed.includes(newStatus)) {
    throw new InvalidStatusTransitionError(currentStatus, newStatus)
  }

  const updated = await updateOrderStatus(orderId, newStatus)

  if (newStatus === 'confirmed') {
    void emitOrderConfirmedEmailEvent({ orderId: updated.id }).catch((error) => {
      logError('orders:update-status:confirmed-email', error)
    })
  }

  return toOrderDetailDto(updated)
}
