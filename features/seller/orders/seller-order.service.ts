import { ItemFulfillmentStatus } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireSeller } from '@/lib/auth/guards'
import {
  OrderItemNotFoundError,
  InvalidFulfillmentTransitionError,
} from '@/lib/errors/seller'
import {
  assertStoreOwnership,
  resolveSellerStoreContext,
} from '@/features/store/store.service'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { SellerOrderItemDto } from './seller-order.dto'
import type { OrderItemFilters } from './seller-order.repository'
import {
  findOrderItemsByStoreId,
  findOrderItemById,
  updateItemFulfillmentStatus,
} from './seller-order.repository'

// ---------------------------------------------------------------------------
// DTO mapper
// ---------------------------------------------------------------------------

async function toSellerOrderItemDto(
  item: {
    id: string
    orderId: string
    storeId: string
    productNameSnapshot: string
    variantSnapshot: string | null
    quantity: number
    unitPriceSnapshot: { toString(): string }
    fulfillmentStatus: string
    order: {
      status: string
      createdAt: Date
      shippingAddressId: string | null
    }
    shipmentItems?: Array<{
      shipment: {
        id: string
        provider: string
        deliveryType: string
        status: string
        trackingNumber: string | null
        recipientCityName: string
        recipientWarehouseName: string | null
      }
    }>
  },
): Promise<SellerOrderItemDto> {
  let shippingAddress: SellerOrderItemDto['shippingAddress'] = null

  if (item.order.shippingAddressId) {
    const addr = await prisma.shippingAddress.findUnique({
      where: { id: item.order.shippingAddressId },
    })
    if (addr) {
      shippingAddress = {
        fullName: addr.fullName,
        city: addr.city,
        country: addr.country,
        street: addr.street,
        building: addr.building,
        apartment: addr.apartment,
        zipCode: addr.zipCode,
      }
    }
  }

  const shipment = item.shipmentItems?.[0]?.shipment

  return {
    id: item.id,
    orderId: item.orderId,
    productNameSnapshot: item.productNameSnapshot,
    variantSnapshot: item.variantSnapshot,
    quantity: item.quantity,
    unitPriceSnapshot: item.unitPriceSnapshot.toString(),
    fulfillmentStatus: item.fulfillmentStatus,
    orderStatus: item.order.status,
    orderCreatedAt: item.order.createdAt,
    shippingAddress,
    shipment: shipment
      ? {
          id: shipment.id,
          provider: shipment.provider,
          deliveryType: shipment.deliveryType,
          status: shipment.status,
          trackingNumber: shipment.trackingNumber,
          recipientCityName: shipment.recipientCityName,
          recipientWarehouseName: shipment.recipientWarehouseName,
        }
      : null,
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getMyOrderItems(
  user: SessionUser,
  filters: OrderItemFilters,
  storeId?: string,
): Promise<SellerOrderItemDto[]> {
  requireSeller(user)
  const store = await resolveSellerStoreContext(user, storeId)

  const items = await findOrderItemsByStoreId(store.id, filters)
  return Promise.all(items.map((item) => toSellerOrderItemDto(item)))
}

export async function getMyOrderItemById(
  user: SessionUser,
  itemId: string,
): Promise<SellerOrderItemDto> {
  requireSeller(user)
  const item = await findOrderItemById(itemId)
  if (!item) throw new OrderItemNotFoundError()
  await assertStoreOwnership(user.id, item.storeId)

  return toSellerOrderItemDto(item)
}

export async function markAsProcessing(
  user: SessionUser,
  itemId: string,
): Promise<SellerOrderItemDto> {
  requireSeller(user)
  const item = await findOrderItemById(itemId)
  if (!item) throw new OrderItemNotFoundError()
  await assertStoreOwnership(user.id, item.storeId)

  if (item.order.status !== 'confirmed') {
    throw new InvalidFulfillmentTransitionError(item.order.status, 'PROCESSING')
  }
  if (item.fulfillmentStatus !== ItemFulfillmentStatus.PENDING) {
    throw new InvalidFulfillmentTransitionError(item.fulfillmentStatus, 'PROCESSING')
  }

  const updated = await updateItemFulfillmentStatus(itemId, ItemFulfillmentStatus.PROCESSING)
  return toSellerOrderItemDto(updated)
}

export async function markAsShipped(
  user: SessionUser,
  itemId: string,
): Promise<SellerOrderItemDto> {
  requireSeller(user)
  const item = await findOrderItemById(itemId)
  if (!item) throw new OrderItemNotFoundError()
  await assertStoreOwnership(user.id, item.storeId)

  if (item.fulfillmentStatus !== ItemFulfillmentStatus.PROCESSING) {
    throw new InvalidFulfillmentTransitionError(item.fulfillmentStatus, 'SHIPPED')
  }

  const updated = await updateItemFulfillmentStatus(itemId, ItemFulfillmentStatus.SHIPPED)
  return toSellerOrderItemDto(updated)
}

export async function markAsDelivered(
  user: SessionUser,
  itemId: string,
): Promise<SellerOrderItemDto> {
  requireSeller(user)
  const item = await findOrderItemById(itemId)
  if (!item) throw new OrderItemNotFoundError()
  await assertStoreOwnership(user.id, item.storeId)

  if (item.fulfillmentStatus !== ItemFulfillmentStatus.SHIPPED) {
    throw new InvalidFulfillmentTransitionError(item.fulfillmentStatus, 'DELIVERED')
  }

  const updated = await updateItemFulfillmentStatus(itemId, ItemFulfillmentStatus.DELIVERED)
  return toSellerOrderItemDto(updated)
}
