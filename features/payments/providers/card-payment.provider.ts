import { PaymentMethod, PaymentProvider, PaymentStatus } from '@/app/generated/prisma/client'
import type {
  ParsedPaymentWebhookEvent,
  PaymentPreparationInput,
  PaymentRefundInput,
  PaymentRefundResult,
  PaymentWebhookVerificationInput,
  PreparedPaymentDraft,
} from '@/features/payments/payment.dto'
import { PaymentProviderError, RefundNotSupportedError } from '@/lib/errors/payment'
import type { PaymentProviderAdapter } from './payment-provider'

const CARD_SKELETON_SIGNATURE = 'card-skeleton'

export class CardPaymentProvider implements PaymentProviderAdapter {
  providerName: string

  constructor(private readonly provider: PaymentProvider = PaymentProvider.LIQPAY) {
    this.providerName = provider
  }

  async createPayment(input: PaymentPreparationInput): Promise<PreparedPaymentDraft> {
    return {
      provider: this.provider,
      providerPaymentId: input.paymentId,
      status: PaymentStatus.PROCESSING,
      method: PaymentMethod.CARD,
      amount: input.amount,
      currency: input.currency,
      checkoutUrl: null,
      failureReason: null,
      paidAt: null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      nextAction: 'AWAITING_PROVIDER_CONFIRMATION',
      checkoutAction: null,
    }
  }

  async verifyWebhook(input: PaymentWebhookVerificationInput): Promise<boolean> {
    return input.headers['x-payment-test-signature'] === CARD_SKELETON_SIGNATURE
  }

  async parseWebhookEvent(input: PaymentWebhookVerificationInput): Promise<ParsedPaymentWebhookEvent> {
    try {
      const payload = JSON.parse(input.rawBody) as {
        providerEventId: string
        providerPaymentId: string
        eventType: string
        amount?: string
        currency?: string
        status: PaymentStatus
      }

      return {
        provider: this.provider,
        providerEventId: payload.providerEventId,
        providerPaymentId: payload.providerPaymentId,
        eventType: payload.eventType,
        amount: payload.amount ?? null,
        currency: payload.currency ?? null,
        status: payload.status,
        payload,
        signatureValid: true,
      }
    } catch {
      throw new PaymentProviderError('Card payment webhook payload is invalid')
    }
  }

  async refundPayment(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    void input
    throw new RefundNotSupportedError('Card refunds require a real payment provider integration before activation')
  }
}
