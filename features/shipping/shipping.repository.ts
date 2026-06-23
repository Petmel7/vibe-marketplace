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

export async function listStoreShippingSettingsByStoreIds(storeIds: string[]) {
  if (storeIds.length === 0) {
    return []
  }

  return prisma.storeShippingSettings.findMany({
    where: {
      storeId: { in: storeIds },
    },
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
  senderCounterpartyRef: string | null
  senderContactRef: string | null
  senderAddressRef: string | null
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
      senderCounterpartyRef: input.senderCounterpartyRef ?? null,
      senderContactRef: input.senderContactRef ?? null,
      senderAddressRef: input.senderAddressRef ?? null,
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
      senderCounterpartyRef: input.senderCounterpartyRef ?? null,
      senderContactRef: input.senderContactRef ?? null,
      senderAddressRef: input.senderAddressRef ?? null,
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
      recipientStreet: true,
      recipientBuilding: true,
      recipientApartment: true,
      recipientWarehouseRef: true,
      recipientWarehouseName: true,
      trackingNumber: true,
      isReturnShipment: true,
      originalShipmentId: true,
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
  originalShipmentId: true,
  isReturnShipment: true,
  recipientName: true,
  recipientPhone: true,
  recipientCityRef: true,
  recipientCityName: true,
  recipientStreet: true,
  recipientBuilding: true,
  recipientApartment: true,
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
  originalShipment: {
    select: {
      id: true,
      status: true,
      trackingNumber: true,
    },
  },
  returnShipments: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      status: true,
      trackingNumber: true,
      createdAt: true,
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

export async function listTrackableShipments(input?: {
  shipmentId?: string
  limit?: number
}) {
  return prisma.shipment.findMany({
    where: {
      provider: ShippingProvider.NOVA_POSHTA,
      trackingNumber: { not: null },
      ...(input?.shipmentId ? { id: input.shipmentId } : {}),
      status: {
        in: [
          ShipmentStatus.LABEL_CREATED,
          ShipmentStatus.SHIPPED,
          ShipmentStatus.IN_TRANSIT,
          ShipmentStatus.ARRIVED,
          ShipmentStatus.READY_TO_SHIP,
        ],
      },
    },
    orderBy: [{ updatedAt: 'asc' }],
    take: input?.limit ?? 50,
    select: shipmentDetailSelect,
  })
}

export async function updateShipmentById(input: {
  id: string
  trackingNumber?: string | null
  providerShipmentId?: string | null
  status?: ShipmentStatus
  estimatedCost?: Prisma.Decimal | null
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

  if (input.estimatedCost !== undefined) {
    data.estimatedCost = input.estimatedCost
  }

  return prisma.shipment.update({
    where: { id: input.id },
    data,
    select: shipmentDetailSelect,
  })
}

export async function createReturnShipment(input: {
  originalShipmentId: string
  orderId: string
  storeId: string
  provider: ShippingProvider
  deliveryType: Prisma.ShipmentCreateInput['deliveryType']
  recipientName: string
  recipientPhone: string
  recipientCityRef: string
  recipientCityName: string
  recipientStreet?: string | null
  recipientBuilding?: string | null
  recipientApartment?: string | null
  recipientWarehouseRef?: string | null
  recipientWarehouseName?: string | null
  estimatedCost?: Prisma.Decimal | null
  currency: string
  items: Array<{
    orderItemId: string
    quantity: number
  }>
}) {
  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.create({
      data: {
        orderId: input.orderId,
        storeId: input.storeId,
        originalShipmentId: input.originalShipmentId,
        isReturnShipment: true,
        provider: input.provider,
        deliveryType: input.deliveryType,
        status: ShipmentStatus.PENDING,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        recipientCityRef: input.recipientCityRef,
        recipientCityName: input.recipientCityName,
        recipientStreet: input.recipientStreet ?? null,
        recipientBuilding: input.recipientBuilding ?? null,
        recipientApartment: input.recipientApartment ?? null,
        recipientWarehouseRef: input.recipientWarehouseRef ?? null,
        recipientWarehouseName: input.recipientWarehouseName ?? null,
        estimatedCost: input.estimatedCost ?? null,
        currency: input.currency,
      },
      select: { id: true },
    })

    await tx.shipmentItem.createMany({
      data: input.items.map((item) => ({
        shipmentId: shipment.id,
        orderItemId: item.orderItemId,
        quantity: item.quantity,
      })),
    })

    return tx.shipment.findUniqueOrThrow({
      where: { id: shipment.id },
      select: shipmentDetailSelect,
    })
  })
}

export type CheckoutOrderTransaction = Prisma.TransactionClient
