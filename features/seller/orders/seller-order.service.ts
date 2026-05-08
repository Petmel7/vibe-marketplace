import { ItemFulfillmentStatus } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireSeller } from '@/lib/auth/guards'
import {
  StoreNotFoundError,
  OrderItemNotFoundError,
  StoreOwnershipError,
  InvalidFulfillmentTransitionError,
} from '@/lib/errors/seller'
import { findStoreByUserId } from '@/features/store/store.repository'
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
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getMyOrderItems(
  user: SessionUser,
  filters: OrderItemFilters,
): Promise<SellerOrderItemDto[]> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()

  const items = await findOrderItemsByStoreId(store.id, filters)
  return Promise.all(items.map((item) => toSellerOrderItemDto(item)))
}

export async function getMyOrderItemById(
  user: SessionUser,
  itemId: string,
): Promise<SellerOrderItemDto> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()

  const item = await findOrderItemById(itemId)
  if (!item) throw new OrderItemNotFoundError()
  if (item.storeId !== store.id) throw new StoreOwnershipError()

  return toSellerOrderItemDto(item)
}

export async function markAsProcessing(
  user: SessionUser,
  itemId: string,
): Promise<SellerOrderItemDto> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()

  const item = await findOrderItemById(itemId)
  if (!item) throw new OrderItemNotFoundError()
  if (item.storeId !== store.id) throw new StoreOwnershipError()

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
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()

  const item = await findOrderItemById(itemId)
  if (!item) throw new OrderItemNotFoundError()
  if (item.storeId !== store.id) throw new StoreOwnershipError()

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
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()

  const item = await findOrderItemById(itemId)
  if (!item) throw new OrderItemNotFoundError()
  if (item.storeId !== store.id) throw new StoreOwnershipError()

  if (item.fulfillmentStatus !== ItemFulfillmentStatus.SHIPPED) {
    throw new InvalidFulfillmentTransitionError(item.fulfillmentStatus, 'DELIVERED')
  }

  const updated = await updateItemFulfillmentStatus(itemId, ItemFulfillmentStatus.DELIVERED)
  return toSellerOrderItemDto(updated)
}
