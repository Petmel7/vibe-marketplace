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
        message:
          '\u041F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0456\u0442\u044C \u0437\u0433\u043E\u0434\u0443 \u043D\u0430 \u043E\u0431\u0440\u043E\u0431\u043A\u0443 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u0438\u0445 \u0434\u0430\u043D\u0438\u0445.',
      }),
    paymentMethod: checkoutPaymentMethodSchema.default('CASH_ON_DELIVERY'),
  })
  .merge(checkoutDeliverySelectionSchema)

export const checkoutPreviewSchema = z
  .object({
    cartId: z.string().uuid().optional(),
    couponCode: z.string().trim().min(1).max(64).nullish(),
    paymentMethod: checkoutPaymentMethodSchema.nullish(),
  })
  .merge(checkoutDeliverySelectionSchema)
