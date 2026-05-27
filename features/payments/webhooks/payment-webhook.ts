import { PaymentProvider } from '@/app/generated/prisma/client'
import { paymentWebhookProviderSchema } from '@/features/payments/payment.schema'

export function parsePaymentProviderParam(value: string): PaymentProvider {
  const parsed = paymentWebhookProviderSchema.parse(value.toLowerCase())

  switch (parsed) {
    case 'manual':
      return PaymentProvider.MANUAL
    case 'liqpay':
      return PaymentProvider.LIQPAY
    case 'stripe':
      return PaymentProvider.STRIPE
    case 'wayforpay':
      return PaymentProvider.WAYFORPAY
    default:
      throw new Error('Unsupported payment provider')
  }
}
