import {
  ShipmentStatus,
  ShippingDeliveryType,
  ShippingProvider,
} from '@/app/generated/prisma/client'
import { z } from 'zod'

const trimmedOptionalString = z.string().trim().max(255).nullish()
const trimmedRequiredString = (label: string, max = 255) =>
  z.string().trim().min(1, `${label} is required`).max(max)

export const novaPoshtaCitiesQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(''),
})

export const novaPoshtaWarehousesQuerySchema = z.object({
  cityRef: z.string().trim().min(1, 'cityRef is required').max(120),
})

export const novaPoshtaEstimateSchema = z
  .object({
    deliveryType: z.nativeEnum(ShippingDeliveryType),
    senderCityRef: trimmedOptionalString,
    senderWarehouseRef: trimmedOptionalString,
    recipientCityRef: trimmedRequiredString('recipientCityRef', 120),
    recipientWarehouseRef: trimmedOptionalString,
    recipientStreet: trimmedOptionalString,
    recipientBuilding: trimmedOptionalString,
    recipientApartment: trimmedOptionalString,
    seatsAmount: z.coerce.number().int().min(1).max(100).optional().default(1),
  })
  .superRefine((input, ctx) => {
    if (input.deliveryType === ShippingDeliveryType.NOVA_POSHTA_WAREHOUSE) {
      if (!input.recipientWarehouseRef?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recipientWarehouseRef'],
          message: 'recipientWarehouseRef is required for warehouse delivery',
        })
      }
    }

    if (input.deliveryType === ShippingDeliveryType.NOVA_POSHTA_COURIER) {
      if (!input.recipientStreet?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recipientStreet'],
          message: 'recipientStreet is required for courier delivery',
        })
      }
      if (!input.recipientBuilding?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recipientBuilding'],
          message: 'recipientBuilding is required for courier delivery',
        })
      }
    }
  })

export const updateStoreShippingSettingsSchema = z
  .object({
    provider: z.nativeEnum(ShippingProvider).default(ShippingProvider.NOVA_POSHTA),
    senderName: trimmedOptionalString,
    senderPhone: trimmedOptionalString,
    senderCityRef: trimmedOptionalString,
    senderCityName: trimmedOptionalString,
    senderWarehouseRef: trimmedOptionalString,
    senderWarehouseName: trimmedOptionalString,
  })
  .superRefine((input, ctx) => {
    const hasWarehouseRef = Boolean(input.senderWarehouseRef?.trim())
    const hasWarehouseName = Boolean(input.senderWarehouseName?.trim())

    if (hasWarehouseRef !== hasWarehouseName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasWarehouseRef ? ['senderWarehouseName'] : ['senderWarehouseRef'],
        message: 'Warehouse reference and warehouse name must be provided together',
      })
    }
  })

export const checkoutDeliverySelectionSchema = z
  .object({
    deliveryType: z.nativeEnum(ShippingDeliveryType).nullish(),
    recipientName: trimmedOptionalString,
    recipientPhone: trimmedOptionalString,
    recipientCityRef: trimmedOptionalString,
    recipientCityName: trimmedOptionalString,
    recipientStreet: trimmedOptionalString,
    recipientBuilding: trimmedOptionalString,
    recipientApartment: trimmedOptionalString,
    recipientWarehouseRef: trimmedOptionalString,
    recipientWarehouseName: trimmedOptionalString,
  })
  .superRefine((input, ctx) => {
    const hasAnyField = Boolean(
      input.deliveryType ??
        input.recipientName?.trim() ??
        input.recipientPhone?.trim() ??
        input.recipientCityRef?.trim() ??
        input.recipientCityName?.trim() ??
        input.recipientStreet?.trim() ??
        input.recipientBuilding?.trim() ??
        input.recipientApartment?.trim() ??
        input.recipientWarehouseRef?.trim() ??
        input.recipientWarehouseName?.trim(),
    )

    if (!hasAnyField) {
      return
    }

    if (
      input.deliveryType !== ShippingDeliveryType.NOVA_POSHTA_WAREHOUSE &&
      input.deliveryType !== ShippingDeliveryType.NOVA_POSHTA_COURIER
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deliveryType'],
        message: 'Unsupported Nova Poshta delivery type',
      })
    }

    const requiredFields = ['recipientName', 'recipientPhone', 'recipientCityRef', 'recipientCityName'] as const

    for (const field of requiredFields) {
      const value = input[field]
      if (typeof value !== 'string' || value.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${field} is required`,
        })
      }
    }

    if (input.deliveryType === ShippingDeliveryType.NOVA_POSHTA_WAREHOUSE) {
      for (const field of ['recipientWarehouseRef', 'recipientWarehouseName'] as const) {
        const value = input[field]
        if (typeof value !== 'string' || value.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${field} is required`,
          })
        }
      }
    }

    if (input.deliveryType === ShippingDeliveryType.NOVA_POSHTA_COURIER) {
      for (const field of ['recipientStreet', 'recipientBuilding'] as const) {
        const value = input[field]
        if (typeof value !== 'string' || value.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${field} is required`,
          })
        }
      }
    }
  })

export const requiredCheckoutDeliverySelectionSchema = z
  .object({
    deliveryType: z.nativeEnum(ShippingDeliveryType),
    recipientName: trimmedRequiredString('recipientName', 120),
    recipientPhone: trimmedRequiredString('recipientPhone', 30),
    recipientCityRef: trimmedRequiredString('recipientCityRef', 120),
    recipientCityName: trimmedRequiredString('recipientCityName', 255),
    recipientStreet: trimmedOptionalString,
    recipientBuilding: trimmedOptionalString,
    recipientApartment: trimmedOptionalString,
    recipientWarehouseRef: trimmedOptionalString,
    recipientWarehouseName: trimmedOptionalString,
  })
  .superRefine((input, ctx) => {
    if (input.deliveryType === ShippingDeliveryType.NOVA_POSHTA_WAREHOUSE) {
      if (!input.recipientWarehouseRef?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recipientWarehouseRef'],
          message: 'recipientWarehouseRef is required',
        })
      }
      if (!input.recipientWarehouseName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recipientWarehouseName'],
          message: 'recipientWarehouseName is required',
        })
      }
    }

    if (input.deliveryType === ShippingDeliveryType.NOVA_POSHTA_COURIER) {
      if (!input.recipientStreet?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recipientStreet'],
          message: 'recipientStreet is required',
        })
      }
      if (!input.recipientBuilding?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recipientBuilding'],
          message: 'recipientBuilding is required',
        })
      }
    }
  })

export const shipmentIdParamsSchema = z.object({
  id: z.string().uuid('Shipment id is invalid'),
})

export const bulkCreateShipmentTtnSchema = z.object({
  shipmentIds: z.array(z.string().uuid('Shipment id is invalid')).min(1).max(50),
})

export const sellerShipmentListQuerySchema = z.object({
  storeId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(ShipmentStatus).optional(),
})

export const shipmentSyncSchema = z.object({
  shipmentId: z.string().uuid('Shipment id is invalid').optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
})

export type NovaPoshtaCitiesQueryInput = z.infer<typeof novaPoshtaCitiesQuerySchema>
export type NovaPoshtaWarehousesQueryInput = z.infer<typeof novaPoshtaWarehousesQuerySchema>
