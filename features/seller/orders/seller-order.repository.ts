import { prisma } from '@/lib/prisma'
import { ItemFulfillmentStatus } from '@/app/generated/prisma/client'

export interface OrderItemFilters {
  status?: string
  page?: number
  limit?: number
}

export async function findOrderItemsByStoreId(storeId: string, filters: OrderItemFilters) {
  const { page = 1, limit = 20 } = filters
  return prisma.orderItem.findMany({
    where: { storeId },
    include: {
      order: true,
      shipmentItems: {
        include: {
          shipment: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })
}

export async function findOrderItemById(id: string) {
  return prisma.orderItem.findUnique({
    where: { id },
    include: {
      order: true,
      variant: true,
      shipmentItems: {
        include: {
          shipment: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}

export async function updateItemFulfillmentStatus(id: string, status: ItemFulfillmentStatus) {
  return prisma.orderItem.update({
    where: { id },
    data: { fulfillmentStatus: status },
    include: {
      order: true,
      variant: true,
      shipmentItems: {
        include: {
          shipment: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}
