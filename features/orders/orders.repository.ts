import { prisma } from '@/lib/prisma'
import type { OrderStatus, Prisma } from '@/app/generated/prisma/client'
import type { OrderFilterInput } from './orders.dto'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const ORDER_ITEMS_INCLUDE: Prisma.OrderInclude = {
  items: true,
  shipments: {
    orderBy: [{ createdAt: 'asc' }],
    select: {
      id: true,
      provider: true,
      deliveryType: true,
      status: true,
      recipientCityRef: true,
      recipientCityName: true,
      recipientWarehouseRef: true,
      recipientWarehouseName: true,
      trackingNumber: true,
    },
  },
  orderPromotion: {
    select: {
      promotionId: true,
      promotionCode: true,
      ownerType: true,
      storeId: true,
      promotionName: true,
      discountType: true,
      discountValue: true,
      discountAmount: true,
      createdAt: true,
    },
  },
  payments: {
    orderBy: [{ createdAt: 'desc' }],
    take: 1,
    select: {
      id: true,
      provider: true,
      method: true,
      status: true,
      paidAt: true,
      createdAt: true,
    },
  },
}

// ---------------------------------------------------------------------------
// Buyer queries
// ---------------------------------------------------------------------------

export async function findOrdersByUserId(userId: string, filters: OrderFilterInput) {
  const { status, page = 1, limit = 20 } = filters
  return prisma.order.findMany({
    where: {
      userId,
      ...(status ? { status: status as OrderStatus } : {}),
    },
    include: ORDER_ITEMS_INCLUDE,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })
}

export async function findOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: ORDER_ITEMS_INCLUDE,
  })
}

// ---------------------------------------------------------------------------
// Seller queries
// ---------------------------------------------------------------------------

export async function findStoreByOwnerId(ownerId: string) {
  return prisma.store.findFirst({ where: { ownerId } })
}

export async function findOrdersByStoreId(storeId: string, filters: OrderFilterInput) {
  const { status, page = 1, limit = 20 } = filters
  return prisma.orderItem.findMany({
    where: {
      storeId,
      ...(status ? { order: { status: status as OrderStatus } } : {}),
    },
    include: {
      order: true,
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })
}

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

export async function findAllOrders(filters: OrderFilterInput) {
  const { status, page = 1, limit = 20 } = filters
  return prisma.order.findMany({
    where: {
      ...(status ? { status: status as OrderStatus } : {}),
    },
    include: ORDER_ITEMS_INCLUDE,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })
}

// ---------------------------------------------------------------------------
// Status update
// ---------------------------------------------------------------------------

export async function updateOrderStatus(id: string, status: string) {
  return prisma.order.update({
    where: { id },
    data: {
      status: status as OrderStatus,
      updatedAt: new Date(),
    },
    include: ORDER_ITEMS_INCLUDE,
  })
}
