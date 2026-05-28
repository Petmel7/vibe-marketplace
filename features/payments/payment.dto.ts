import type {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  RefundStatus,
} from '@/app/generated/prisma/client'

export type CheckoutPaymentMethod = 'CASH_ON_DELIVERY' | 'CARD'

export type PaymentNextAction =
  | 'NONE'
  | 'AWAITING_CASH_ON_DELIVERY'
  | 'AWAITING_PROVIDER_CONFIRMATION'
  | 'AWAITING_MANUAL_CONFIRMATION'

export type PaymentCheckoutAction = 'POST_FORM'

export type PaymentHostedCheckoutActionDto = {
  provider: PaymentProvider
  checkoutAction: PaymentCheckoutAction
  checkoutUrl: string
  data: string
  signature: string
  paymentId: string
  orderId: string
}

export type PaymentPreparationInput = {
  method: CheckoutPaymentMethod | 'MANUAL'
  amount: string
  currency: string
  orderReference: string
  orderId: string
  paymentId: string
}

export type PreparedPaymentDraft = {
  provider: PaymentProvider
  providerPaymentId: string | null
  status: PaymentStatus
  method: PaymentMethod
  amount: string
  currency: string
  checkoutUrl: string | null
  failureReason: string | null
  paidAt: Date | null
  expiresAt: Date | null
  nextAction: PaymentNextAction
  checkoutAction: PaymentHostedCheckoutActionDto | null
}

export type PaymentWebhookVerificationInput = {
  provider: PaymentProvider
  headers: Record<string, string | undefined>
  rawBody: string
}

export type ParsedPaymentWebhookEvent = {
  provider: PaymentProvider
  providerEventId: string
  providerPaymentId: string
  eventType: string
  amount?: string | null
  currency?: string | null
  status: PaymentStatus
  payload: unknown
  signatureValid: boolean
}

export type PaymentRefundInput = {
  paymentId: string
  amount: string
  currency: string
  reason?: string | null
}

export type PaymentRefundResult = {
  providerRefundId: string | null
  status: RefundStatus
}

export type PaymentDto = {
  id: string
  orderId: string
  provider: PaymentProvider
  providerPaymentId: string | null
  status: PaymentStatus
  method: PaymentMethod
  amount: string
  currency: string
  checkoutUrl: string | null
  failureReason: string | null
  paidAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export type PaymentAttemptDto = {
  id: string
  paymentId: string
  provider: PaymentProvider
  status: PaymentStatus
  amount: string
  errorMessage: string | null
  createdAt: string
}

export type PaymentWebhookEventDto = {
  id: string
  paymentId: string | null
  provider: PaymentProvider
  providerEventId: string
  eventType: string
  signatureValid: boolean
  processedAt: string | null
  createdAt: string
}

export type RefundDto = {
  id: string
  paymentId: string
  orderItemId: string | null
  providerRefundId: string | null
  status: RefundStatus
  amount: string
  reason: string | null
  createdAt: string
  updatedAt: string
}

export type PaymentDetailDto = PaymentDto & {
  attempts: PaymentAttemptDto[]
  refunds: RefundDto[]
  webhookEvents: PaymentWebhookEventDto[]
}

export type PaymentListItemDto = PaymentDto & {
  orderStatus: string
}

export type PaymentListResponseDto = {
  items: PaymentListItemDto[]
  page: number
  limit: number
  total: number
}

export type PaymentDiagnosticsQueryDto = {
  page: number
  limit: number
  status?: PaymentStatus
  provider?: PaymentProvider
  method?: PaymentMethod
  orderId?: string
}

export type PaymentWebhookProcessResultDto = {
  provider: PaymentProvider
  providerEventId: string
  paymentId: string | null
  status: PaymentStatus | 'IGNORED'
  duplicate: boolean
}

export type CheckoutPaymentResponseDto = {
  paymentId: string
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  checkoutUrl: string | null
  nextAction: PaymentNextAction
  paymentAction: PaymentHostedCheckoutActionDto | null
}
