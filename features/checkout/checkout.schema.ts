import { z } from 'zod'
import { checkoutPaymentMethodSchema } from '@/features/payments/payment.schema'
import { checkoutDeliverySelectionSchema } from '@/features/shipping/shipping.schema'

const moneyStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid monetary amount')

export const checkoutSchema = z
  .object({
    cartId: z.string().uuid(),
    shippingAddressId: z.string().uuid().nullish(),
    expectedSubtotal: moneyStringSchema.nullish(),
    expectedTotal: moneyStringSchema.nullish(),
    couponCode: z.string().trim().min(1).max(64).nullish(),
    note: z.string().max(500).optional(),
    acceptedPrivacy: z
      .boolean()
      .refine((value) => value === true, {
        message: 'Підтвердьте згоду на обробку персональних даних.',
      }),
    paymentMethod: checkoutPaymentMethodSchema.default('CASH_ON_DELIVERY'),
  })
  .merge(checkoutDeliverySelectionSchema)

export const checkoutPreviewSchema = z
  .object({
    cartId: z.string().uuid().optional(),
  })
  .merge(checkoutDeliverySelectionSchema)
