import { PaymentMethod, PaymentProvider } from '@/app/generated/prisma/client'
import { CardPaymentProvider } from '@/features/payments/providers/card-payment.provider'
import { LiqPayPaymentProvider } from '@/features/payments/providers/liqpay-payment.provider'
import {
  CashOnDeliveryProvider,
  ManualPaymentProvider,
} from '@/features/payments/providers/manual-payment.provider'
import type { PaymentProviderAdapter } from '@/features/payments/providers/payment-provider'
import { UnsupportedPaymentMethodError } from '@/lib/errors/payment'

export function getPaymentProviderAdapterForMethod(
  method: PaymentMethod,
): PaymentProviderAdapter {
  switch (method) {
    case PaymentMethod.CASH_ON_DELIVERY:
      return new CashOnDeliveryProvider()
    case PaymentMethod.CARD:
      return new LiqPayPaymentProvider()
    case PaymentMethod.MANUAL:
      return new ManualPaymentProvider()
    default:
      throw new UnsupportedPaymentMethodError(method)
  }
}

export function getPaymentProviderAdapterByProvider(
  provider: PaymentProvider,
): PaymentProviderAdapter {
  switch (provider) {
    case PaymentProvider.MANUAL:
      return new ManualPaymentProvider()
    case PaymentProvider.LIQPAY:
      return new LiqPayPaymentProvider()
    case PaymentProvider.STRIPE:
    case PaymentProvider.WAYFORPAY:
      return new CardPaymentProvider(provider)
    default:
      throw new UnsupportedPaymentMethodError(provider)
  }
}
