import { ShippingProvider, type Prisma } from '@/app/generated/prisma/client'
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

export type CheckoutOrderTransaction = Prisma.TransactionClient
