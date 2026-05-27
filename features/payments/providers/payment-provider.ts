import type {
  ParsedPaymentWebhookEvent,
  PaymentPreparationInput,
  PaymentRefundInput,
  PaymentRefundResult,
  PaymentWebhookVerificationInput,
  PreparedPaymentDraft,
} from '@/features/payments/payment.dto'

export interface PaymentProviderAdapter {
  providerName: string
  createPayment(input: PaymentPreparationInput): Promise<PreparedPaymentDraft>
  verifyWebhook(input: PaymentWebhookVerificationInput): Promise<boolean>
  parseWebhookEvent(input: PaymentWebhookVerificationInput): Promise<ParsedPaymentWebhookEvent>
  refundPayment(input: PaymentRefundInput): Promise<PaymentRefundResult>
}
