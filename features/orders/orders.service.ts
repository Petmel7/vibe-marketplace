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
  }
}

function toOrderDetailDto(order: {
  id: string
  status: string
  totalAmount: { toString(): string }
  shippingAddressId: string | null
  note: string | null
  createdAt: Date
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
  return toOrderDetailDto(updated)
}
