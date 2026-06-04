import {
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
        input.recipientWarehouseRef?.trim() ??
        input.recipientWarehouseName?.trim(),
    )

    if (!hasAnyField) {
      return
    }

    if (input.deliveryType !== ShippingDeliveryType.NOVA_POSHTA_WAREHOUSE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deliveryType'],
        message: 'Only Nova Poshta warehouse delivery is supported right now',
      })
    }

    const requiredFields = [
      'recipientName',
      'recipientPhone',
      'recipientCityRef',
      'recipientCityName',
      'recipientWarehouseRef',
      'recipientWarehouseName',
    ] as const

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
  })

export const requiredCheckoutDeliverySelectionSchema = z.object({
  deliveryType: z.literal(ShippingDeliveryType.NOVA_POSHTA_WAREHOUSE),
  recipientName: trimmedRequiredString('recipientName', 120),
  recipientPhone: trimmedRequiredString('recipientPhone', 30),
  recipientCityRef: trimmedRequiredString('recipientCityRef', 120),
  recipientCityName: trimmedRequiredString('recipientCityName', 255),
  recipientWarehouseRef: trimmedRequiredString('recipientWarehouseRef', 120),
  recipientWarehouseName: trimmedRequiredString('recipientWarehouseName', 255),
})

export type NovaPoshtaCitiesQueryInput = z.infer<typeof novaPoshtaCitiesQuerySchema>
export type NovaPoshtaWarehousesQueryInput = z.infer<typeof novaPoshtaWarehousesQuerySchema>
