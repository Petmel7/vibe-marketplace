import { PaymentMethod, PaymentProvider, PaymentStatus } from '@/app/generated/prisma/client'
import { z } from 'zod'

export const checkoutPaymentMethodSchema = z.enum([
  PaymentMethod.CASH_ON_DELIVERY,
  PaymentMethod.CARD,
])

export const manualPaymentMethodSchema = z.enum([
  PaymentMethod.MANUAL,
])

export const paymentDiagnosticsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(PaymentStatus).optional(),
  provider: z.nativeEnum(PaymentProvider).optional(),
  method: z.nativeEnum(PaymentMethod).optional(),
  orderId: z.string().uuid().optional(),
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
