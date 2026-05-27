import { z } from 'zod'
import { checkoutPaymentMethodSchema } from '@/features/payments/payment.schema'

const moneyStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid monetary amount')

export const checkoutSchema = z.object({
  cartId: z.string().uuid(),
  shippingAddressId: z.string().uuid().nullish(),
  expectedSubtotal: moneyStringSchema.nullish(),
  expectedTotal: moneyStringSchema.nullish(),
  note: z.string().max(500).optional(),
  paymentMethod: checkoutPaymentMethodSchema.default('CASH_ON_DELIVERY'),
})

export const checkoutPreviewSchema = z.object({
  cartId: z.string().uuid().optional(),
})
