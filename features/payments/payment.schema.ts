import { PaymentMethod, PaymentProvider, PaymentStatus } from '@/app/generated/prisma/client'
import {
  defaultedQueryNumber,
  optionalQueryParam,
  optionalQueryUuid,
} from '@/lib/validation/query'
import { z } from 'zod'

export const checkoutPaymentMethodSchema = z.enum([
  PaymentMethod.CASH_ON_DELIVERY,
  PaymentMethod.CARD,
])

export const manualPaymentMethodSchema = z.enum([
  PaymentMethod.MANUAL,
])

export const paymentDiagnosticsQuerySchema = z.object({
  page: defaultedQueryNumber(z.coerce.number().int().min(1), 1),
  limit: defaultedQueryNumber(z.coerce.number().int().min(1).max(100), 20),
  status: optionalQueryParam(z.nativeEnum(PaymentStatus)),
  provider: optionalQueryParam(z.nativeEnum(PaymentProvider)),
  method: optionalQueryParam(z.nativeEnum(PaymentMethod)),
  orderId: optionalQueryUuid(),
})

export const paymentWebhookProviderSchema = z.enum([
  PaymentProvider.MANUAL.toLowerCase(),
  PaymentProvider.LIQPAY.toLowerCase(),
  PaymentProvider.STRIPE.toLowerCase(),
  PaymentProvider.WAYFORPAY.toLowerCase(),
])

const moneyStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid monetary amount')

export const adminRefundPaymentSchema = z.object({
  amount: moneyStringSchema.optional(),
  reason: z.string().max(500).optional(),
})
