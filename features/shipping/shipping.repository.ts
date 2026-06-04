import {
  ShipmentStatus,
  ShippingProvider,
  type Prisma,
} from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'

export async function findStoreShippingSettingsByStoreId(storeId: string) {
  return prisma.storeShippingSettings.findUnique({
    where: { storeId },
  })
}

export async function upsertStoreShippingSettings(input: {
  storeId: string
  provider: ShippingProvider
  senderName: string | null
  senderPhone: string | null
  senderCityRef: string | null
  senderCityName: string | null
  senderWarehouseRef: string | null
  senderWarehouseName: string | null
  isConfigured: boolean
}) {
  return prisma.storeShippingSettings.upsert({
    where: { storeId: input.storeId },
    create: {
      storeId: input.storeId,
      provider: input.provider,
      senderName: input.senderName ?? '',
      senderPhone: input.senderPhone ?? '',
      senderCityRef: input.senderCityRef ?? '',
      senderCityName: input.senderCityName ?? '',
      senderWarehouseRef: input.senderWarehouseRef ?? null,
      senderWarehouseName: input.senderWarehouseName ?? null,
      isConfigured: input.isConfigured,
    },
    update: {
      provider: input.provider,
      senderName: input.senderName ?? '',
      senderPhone: input.senderPhone ?? '',
      senderCityRef: input.senderCityRef ?? '',
      senderCityName: input.senderCityName ?? '',
      senderWarehouseRef: input.senderWarehouseRef ?? null,
      senderWarehouseName: input.senderWarehouseName ?? null,
      isConfigured: input.isConfigured,
      updatedAt: new Date(),
    },
  })
}

export async function findOrderShipmentsByOrderId(orderId: string) {
  return prisma.shipment.findMany({
    where: { orderId },
    orderBy: { createdAt: 'asc' },
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
  })
}

const shipmentDetailSelect = {
  id: true,
  orderId: true,
  storeId: true,
  provider: true,
  deliveryType: true,
  status: true,
  recipientName: true,
  recipientPhone: true,
  recipientCityRef: true,
  recipientCityName: true,
  recipientWarehouseRef: true,
  recipientWarehouseName: true,
  estimatedCost: true,
  currency: true,
  trackingNumber: true,
  providerShipmentId: true,
  createdAt: true,
  updatedAt: true,
  order: {
    select: {
      id: true,
      userId: true,
      status: true,
    },
  },
  store: {
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  },
  items: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      quantity: true,
      orderItemId: true,
      orderItem: {
        select: {
          id: true,
          productNameSnapshot: true,
          quantity: true,
          unitPriceSnapshot: true,
          fulfillmentStatus: true,
          storeId: true,
          order: {
            select: {
              status: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ShipmentSelect

export async function findShipmentById(id: string) {
  return prisma.shipment.findUnique({
    where: { id },
    select: shipmentDetailSelect,
  })
}

export async function listShipmentsByStoreId(input: {
  storeId: string
  status?: ShipmentStatus
  page: number
  limit: number
}) {
  return prisma.shipment.findMany({
    where: {
      storeId: input.storeId,
      ...(input.status ? { status: input.status } : {}),
    },
    orderBy: [{ createdAt: 'desc' }],
    skip: (input.page - 1) * input.limit,
    take: input.limit,
    select: shipmentDetailSelect,
  })
}

export async function countShipmentsByStoreId(input: {
  storeId: string
  status?: ShipmentStatus
}) {
  return prisma.shipment.count({
    where: {
      storeId: input.storeId,
      ...(input.status ? { status: input.status } : {}),
    },
  })
}

export async function updateShipmentById(input: {
  id: string
  trackingNumber?: string | null
  providerShipmentId?: string | null
  status?: ShipmentStatus
}) {
  const data: Prisma.ShipmentUpdateInput = {
    updatedAt: new Date(),
  }

  if (input.trackingNumber !== undefined) {
    data.trackingNumber = input.trackingNumber
  }

  if (input.providerShipmentId !== undefined) {
    data.providerShipmentId = input.providerShipmentId
  }

  if (input.status !== undefined) {
    data.status = input.status
  }

  return prisma.shipment.update({
    where: { id: input.id },
    data,
    select: shipmentDetailSelect,
  })
}

export type CheckoutOrderTransaction = Prisma.TransactionClient
