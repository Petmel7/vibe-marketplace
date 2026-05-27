import { PaymentMethod, PaymentProvider, PaymentStatus, RefundStatus } from '@/app/generated/prisma/client'
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

export class ManualPaymentProvider implements PaymentProviderAdapter {
  providerName = 'MANUAL'

  async createPayment(input: PaymentPreparationInput): Promise<PreparedPaymentDraft> {
    return {
      provider: PaymentProvider.MANUAL,
      providerPaymentId: `manual:${input.orderReference}`,
      status: PaymentStatus.PENDING,
      method: PaymentMethod.MANUAL,
      amount: input.amount,
      currency: input.currency,
      checkoutUrl: null,
      failureReason: null,
      paidAt: null,
      expiresAt: null,
      nextAction: 'AWAITING_MANUAL_CONFIRMATION',
    }
  }

  async verifyWebhook(input: PaymentWebhookVerificationInput): Promise<boolean> {
    void input
    return true
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
        provider: PaymentProvider.MANUAL,
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
      throw new PaymentProviderError('Manual payment webhook payload is invalid')
    }
  }

  async refundPayment(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    return {
      providerRefundId: `manual-refund:${input.paymentId}`,
      status: RefundStatus.SUCCEEDED,
    }
  }
}

export class CashOnDeliveryProvider implements PaymentProviderAdapter {
  providerName = 'CASH_ON_DELIVERY'

  async createPayment(input: PaymentPreparationInput): Promise<PreparedPaymentDraft> {
    return {
      provider: PaymentProvider.MANUAL,
      providerPaymentId: `cod:${input.orderReference}`,
      status: PaymentStatus.PENDING,
      method: PaymentMethod.CASH_ON_DELIVERY,
      amount: input.amount,
      currency: input.currency,
      checkoutUrl: null,
      failureReason: null,
      paidAt: null,
      expiresAt: null,
      nextAction: 'AWAITING_CASH_ON_DELIVERY',
    }
  }

  async verifyWebhook(input: PaymentWebhookVerificationInput): Promise<boolean> {
    void input
    return true
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
        provider: PaymentProvider.MANUAL,
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
      throw new PaymentProviderError('Cash on delivery webhook payload is invalid')
    }
  }

  async refundPayment(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    void input
    throw new RefundNotSupportedError('Cash on delivery refunds are not supported in the payment infrastructure yet')
  }
}
