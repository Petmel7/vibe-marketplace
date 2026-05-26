import { z } from 'zod'

const moneyStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid monetary amount')

export const checkoutSchema = z.object({
  cartId: z.string().uuid(),
  shippingAddressId: z.string().uuid().nullish(),
  expectedSubtotal: moneyStringSchema.nullish(),
  expectedTotal: moneyStringSchema.nullish(),
  note: z.string().max(500).optional(),
})

export const checkoutPreviewSchema = z.object({
  cartId: z.string().uuid().optional(),
})
