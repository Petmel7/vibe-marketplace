import { randomUUID } from 'node:crypto'
import Decimal from 'decimal.js'
import { PaymentMethod, PaymentProvider, PaymentStatus } from '@/app/generated/prisma/client'
import { requireAdmin } from '@/lib/auth/guards'
import type { SessionUser } from '@/features/auth/auth.dto'
import {
  emitPaymentFailedEmailEvent,
  emitPaymentSucceededEmailEvent,
  emitSellerNewOrderEmailEvents,
} from '@/features/email/events/email.events'
import {
  emitPaymentFailedNotificationEvent,
  emitPaymentSucceededNotificationEvent,
  emitSellerNewOrderNotificationEvents,
} from '@/features/notifications/events/notification.events'
import { scheduleProductMetricsRecalculation } from '@/features/products/product-metrics.jobs'
import {
  recordPaymentFailedRiskSignal,
  recordRefundIssuedRiskSignals,
} from '@/features/risk/risk.service'
import { materializeSellerFinanceForOrderAction } from '@/features/payouts/payouts.service'
import { logError } from '@/utils/logger'
import {
  applyFailedPayment,
  applyRefundOutcome,
  applySuccessfulPayment,
  countPayments,
  createPaymentAttempt,
  createPaymentWebhookEvent,
  createRefundRecord,
  findPaymentById,
  findPaymentByProviderPaymentId,
  findPaymentCheckoutSessionById,
  listPayments,
  markManualPaymentSucceeded,
  markWebhookProcessed,
} from './payment.repository'
import {
  InvalidPaymentTransitionError,
  LiqPayAmountMismatchError,
  LiqPaySignatureError,
  PaymentAmountMismatchError,
  PaymentNotFoundError,
  PaymentWebhookDuplicateError,
  PaymentWebhookSignatureError,
} from '@/lib/errors/payment'
import type {
  CheckoutPaymentMethod,
  CheckoutPaymentResponseDto,
  ParsedPaymentWebhookEvent,
  PaymentDetailDto,
  PaymentDiagnosticsQueryDto,
  PaymentDto,
  PaymentHostedCheckoutActionDto,
  PaymentListItemDto,
  PaymentListResponseDto,
  PaymentWebhookProcessResultDto,
  PreparedPaymentDraft,
} from './payment.dto'
import {
  getPaymentProviderAdapterByProvider,
  getPaymentProviderAdapterForMethod,
} from './services/payment-provider.service'

type PaymentRecord = NonNullable<Awaited<ReturnType<typeof findPaymentById>>>
type PaymentListRecord = Awaited<ReturnType<typeof listPayments>>[number]
type PaymentCheckoutSession = NonNullable<Awaited<ReturnType<typeof findPaymentCheckoutSessionById>>>

function toPaymentDto(payment: {
  id: string
  orderId: string
  provider: PaymentProvider
  providerPaymentId: string | null
  status: PaymentStatus
  method: PaymentMethod
  amount: { toString(): string }
  currency: string
  checkoutUrl: string | null
  failureReason: string | null
  paidAt: Date | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}): PaymentDto {
  return {
    id: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId,
    status: payment.status,
    method: payment.method,
    amount: payment.amount.toString(),
    currency: payment.currency,
    checkoutUrl: payment.checkoutUrl,
    failureReason: payment.failureReason,
    paidAt: payment.paidAt?.toISOString() ?? null,
    expiresAt: payment.expiresAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  }
}

function toPaymentDetailDto(payment: PaymentRecord): PaymentDetailDto {
  return {
    ...toPaymentDto(payment),
    attempts: payment.attempts.map((attempt) => ({
      id: attempt.id,
      paymentId: attempt.paymentId,
      provider: attempt.provider,
      status: attempt.status,
      amount: attempt.amount.toString(),
      errorMessage: attempt.errorMessage,
      createdAt: attempt.createdAt.toISOString(),
    })),
    refunds: payment.refunds.map((refund) => ({
      id: refund.id,
      paymentId: refund.paymentId,
      orderItemId: refund.orderItemId,
      providerRefundId: refund.providerRefundId,
      status: refund.status,
      amount: refund.amount.toString(),
      reason: refund.reason,
      createdAt: refund.createdAt.toISOString(),
      updatedAt: refund.updatedAt.toISOString(),
    })),
    webhookEvents: payment.webhookEvents.map((event) => ({
      id: event.id,
      paymentId: event.paymentId,
      provider: event.provider,
      providerEventId: event.providerEventId,
      eventType: event.eventType,
      signatureValid: event.signatureValid,
      processedAt: event.processedAt?.toISOString() ?? null,
      createdAt: event.createdAt.toISOString(),
    })),
  }
}

function toPaymentListItemDto(payment: PaymentListRecord): PaymentListItemDto {
  return {
    ...toPaymentDto(payment),
    orderStatus: payment.order.status,
  }
}

function toHostedCheckoutPayloadDto(
  action: PaymentHostedCheckoutActionDto | null,
): PaymentHostedCheckoutActionDto | null {
  if (!action) {
    return null
  }

  return {
    provider: action.provider,
    checkoutAction: action.checkoutAction,
    checkoutUrl: action.checkoutUrl,
    data: action.data,
    signature: action.signature,
    paymentId: action.paymentId,
    orderId: action.orderId,
  }
}

function extractHostedCheckoutAction(payment: PaymentCheckoutSession) {
  const requestPayload = payment.attempts[0]?.requestPayload as
    | {
        checkoutAction?: PaymentHostedCheckoutActionDto | null
      }
    | undefined

  return requestPayload?.checkoutAction ?? null
}

function assertAdmin(user: SessionUser) {
  requireAdmin(user)
}

function assertPaymentAmountMatchesOrder(
  event: ParsedPaymentWebhookEvent,
  payment: PaymentRecord,
  provider: PaymentProvider,
) {
  const orderTotal = new Decimal(payment.order.totalAmount.toString())
  const paymentAmount = new Decimal(payment.amount.toString())
  const mismatchError =
    provider === PaymentProvider.LIQPAY
      ? LiqPayAmountMismatchError
      : PaymentAmountMismatchError

  if (!paymentAmount.equals(orderTotal)) {
    throw new mismatchError()
  }

  if (event.amount && !new Decimal(event.amount).equals(paymentAmount)) {
    throw new mismatchError('Webhook payment amount does not match the stored payment record')
  }

  if (event.currency && event.currency !== payment.currency) {
    throw new mismatchError('Webhook currency does not match the stored payment record')
  }
}

function getUniqueOrderStoresForRisk(payment: PaymentRecord) {
  const stores = new Map<string, { storeId: string; ownerId: string }>()

  for (const item of payment.order.items ?? []) {
    if (!stores.has(item.storeId)) {
      stores.set(item.storeId, {
        storeId: item.store.id,
        ownerId: item.store.ownerId,
      })
    }
  }

  return [...stores.values()]
}

export function resolveHostedCheckoutRedirectUrl(paymentId: string) {
  return `/api/payments/checkout/${paymentId}`
}

export async function prepareCheckoutPayment(
  method: CheckoutPaymentMethod,
  totalAmount: Decimal,
  orderReference: string,
  orderId: string,
  paymentId: string,
): Promise<PreparedPaymentDraft> {
  const adapter = getPaymentProviderAdapterForMethod(method as PaymentMethod)

  return adapter.createPayment({
    method,
    amount: totalAmount.toFixed(2),
    currency: 'UAH',
    orderReference,
    orderId,
    paymentId,
  })
}

export function resolveCheckoutOrderStatus(method: CheckoutPaymentMethod) {
  return method === PaymentMethod.CASH_ON_DELIVERY ? 'confirmed' : 'pending'
}

export async function getHostedCheckoutActionByPaymentId(
  paymentId: string,
): Promise<CheckoutPaymentResponseDto> {
  const payment = await findPaymentCheckoutSessionById(paymentId)
  if (!payment) {
    throw new PaymentNotFoundError()
  }

  const checkoutAction = extractHostedCheckoutAction(payment)
  if (!checkoutAction) {
    throw new InvalidPaymentTransitionError(payment.status, 'HOSTED_CHECKOUT_UNAVAILABLE')
  }

  return {
    paymentId: payment.id,
    paymentStatus: payment.status,
    paymentMethod: payment.method,
    checkoutUrl: payment.checkoutUrl,
    nextAction: 'AWAITING_PROVIDER_CONFIRMATION',
    paymentAction: toHostedCheckoutPayloadDto(checkoutAction),
  }
}

export async function getHostedCheckoutHtml(paymentId: string): Promise<string> {
  const checkout = await getHostedCheckoutActionByPaymentId(paymentId)
  if (!checkout.paymentAction) {
    throw new InvalidPaymentTransitionError(checkout.paymentStatus, 'HOSTED_CHECKOUT_UNAVAILABLE')
  }

  const escapedCheckoutUrl = checkout.paymentAction.checkoutUrl.replace(/"/g, '&quot;')
  const escapedData = checkout.paymentAction.data.replace(/"/g, '&quot;')
  const escapedSignature = checkout.paymentAction.signature.replace(/"/g, '&quot;')

  return `<!doctype html>
<html lang="uk">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LiqPay redirect</title>
  </head>
  <body>
    <form id="liqpay-checkout-form" method="POST" action="${escapedCheckoutUrl}" accept-charset="utf-8">
      <input type="hidden" name="data" value="${escapedData}" />
      <input type="hidden" name="signature" value="${escapedSignature}" />
      <noscript>
        <button type="submit">Continue to LiqPay</button>
      </noscript>
    </form>
    <script>
      document.getElementById('liqpay-checkout-form')?.submit();
    </script>
  </body>
</html>`
}

export async function getAdminPayments(
  user: SessionUser,
  query: PaymentDiagnosticsQueryDto,
): Promise<PaymentListResponseDto> {
  assertAdmin(user)
  const [items, total] = await Promise.all([listPayments(query), countPayments(query)])

  return {
    items: items.map(toPaymentListItemDto),
    page: query.page,
    limit: query.limit,
    total,
  }
}

export async function getAdminPaymentById(
  user: SessionUser,
  id: string,
): Promise<PaymentDetailDto> {
  assertAdmin(user)
  const payment = await findPaymentById(id)
  if (!payment) {
    throw new PaymentNotFoundError()
  }

  return toPaymentDetailDto(payment)
}

export async function markManualPaymentPaid(user: SessionUser, id: string): Promise<PaymentDetailDto> {
  assertAdmin(user)
  const payment = await findPaymentById(id)
  if (!payment) {
    throw new PaymentNotFoundError()
  }

  if (payment.method !== PaymentMethod.MANUAL) {
    throw new InvalidPaymentTransitionError(payment.method, 'MANUAL_MARK_PAID')
  }

  if (payment.status === PaymentStatus.SUCCEEDED || payment.status === PaymentStatus.REFUNDED) {
    throw new InvalidPaymentTransitionError(payment.status, PaymentStatus.SUCCEEDED)
  }

  const updated = await markManualPaymentSucceeded(id)
  scheduleProductMetricsRecalculation({
    reason: 'order-paid-manual',
    dedupeKey: `product-metrics:order-paid:${payment.orderId}`,
  })
  const refreshed = await findPaymentById(updated.payment.id)
  if (!refreshed) {
    throw new PaymentNotFoundError()
  }

  return toPaymentDetailDto(refreshed)
}

export async function refundPaymentByAdmin(
  user: SessionUser,
  id: string,
  input: { amount?: string; reason?: string },
): Promise<PaymentDetailDto> {
  assertAdmin(user)
  const payment = await findPaymentById(id)
  if (!payment) {
    throw new PaymentNotFoundError()
  }

  const adapter = getPaymentProviderAdapterForMethod(payment.method)
  const refundAmount = new Decimal(input.amount ?? payment.amount.toString())
  if (refundAmount.greaterThan(new Decimal(payment.amount.toString()))) {
    throw new PaymentAmountMismatchError('Refund amount cannot exceed the original payment amount')
  }

  const refundResult = await adapter.refundPayment({
    paymentId: payment.id,
    amount: refundAmount.toFixed(2),
    currency: payment.currency,
    reason: input.reason ?? null,
  })

  const refund = await createRefundRecord({
    paymentId: payment.id,
    providerRefundId: refundResult.providerRefundId,
    status: refundResult.status,
    amount: refundAmount,
    reason: input.reason ?? null,
  })

  await applyRefundOutcome({
    paymentId: payment.id,
    amount: refundAmount,
    fullAmount: refundAmount.equals(new Decimal(payment.amount.toString())),
  })

  void recordRefundIssuedRiskSignals({
    refundId: refund.id,
    orderId: payment.orderId,
    amount: refundAmount.toFixed(2),
    reason: input.reason ?? null,
    stores: getUniqueOrderStoresForRisk(payment),
  }).catch((error) => {
    logError('payments:refund:risk-signal', error)
  })

  const updated = await findPaymentById(payment.id)
  if (!updated) {
    throw new PaymentNotFoundError()
  }

  return toPaymentDetailDto(updated)
}

export async function processPaymentWebhook(
  provider: PaymentProvider,
  input: {
    headers: Record<string, string | undefined>
    rawBody: string
  },
): Promise<PaymentWebhookProcessResultDto> {
  const adapter = getPaymentProviderAdapterByProvider(provider)
  const signatureValid = await adapter.verifyWebhook({
    provider,
    headers: input.headers,
    rawBody: input.rawBody,
  })

  if (!signatureValid) {
    if (provider === PaymentProvider.LIQPAY) {
      throw new LiqPaySignatureError()
    }

    throw new PaymentWebhookSignatureError()
  }

  const parsedEvent = await adapter.parseWebhookEvent({
    provider,
    headers: input.headers,
    rawBody: input.rawBody,
  })

  const payment = await findPaymentByProviderPaymentId(parsedEvent.providerPaymentId)
  const webhookEvent = await createPaymentWebhookEvent({
    paymentId: payment?.id ?? null,
    provider: parsedEvent.provider,
    providerEventId: parsedEvent.providerEventId,
    eventType: parsedEvent.eventType,
    payload: parsedEvent.payload as never,
    signatureValid: parsedEvent.signatureValid,
  }).catch((error) => {
    if (error instanceof PaymentWebhookDuplicateError) {
      return null
    }

    throw error
  })

  if (!payment) {
    return {
      provider,
      providerEventId: parsedEvent.providerEventId,
      paymentId: null,
      status: 'IGNORED',
      duplicate: webhookEvent === null,
    }
  }

  if (webhookEvent === null) {
    return {
      provider,
      providerEventId: parsedEvent.providerEventId,
      paymentId: payment.id,
      status: 'IGNORED',
      duplicate: true,
    }
  }

  assertPaymentAmountMatchesOrder(parsedEvent, payment, provider)

  if (parsedEvent.status === PaymentStatus.SUCCEEDED) {
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      await applySuccessfulPayment({
        paymentId: payment.id,
        paidAt: new Date(),
      })

      void emitPaymentSucceededEmailEvent({ paymentId: payment.id }).catch((error) => {
        logError('payments:webhook:payment-succeeded-email', error)
      })
      void emitPaymentSucceededNotificationEvent({ paymentId: payment.id }).catch((error) => {
        logError('payments:webhook:payment-succeeded-notification', error)
      })
      void emitSellerNewOrderEmailEvents({ paymentId: payment.id }).catch((error) => {
        logError('payments:webhook:seller-new-order-email', error)
      })
      void emitSellerNewOrderNotificationEvents({ paymentId: payment.id }).catch((error) => {
        logError('payments:webhook:seller-new-order-notification', error)
      })
      void materializeSellerFinanceForOrderAction(payment.orderId).catch((error) => {
        logError('payments:webhook:seller-finance-materialization', error)
      })
      scheduleProductMetricsRecalculation({
        reason: 'order-paid-webhook',
        dedupeKey: `product-metrics:order-paid:${payment.orderId}`,
      })
    }
  } else if (parsedEvent.status === PaymentStatus.REFUNDED) {
    if (
      payment.status !== PaymentStatus.REFUNDED &&
      payment.status !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      const refund = await createRefundRecord({
        paymentId: payment.id,
        providerRefundId: parsedEvent.providerEventId,
        status: 'SUCCEEDED',
        amount: new Decimal(payment.amount.toString()),
        reason: 'LiqPay reversed payment',
      })

      await applyRefundOutcome({
        paymentId: payment.id,
        amount: new Decimal(payment.amount.toString()),
        fullAmount: true,
      })

      void recordRefundIssuedRiskSignals({
        refundId: refund.id,
        orderId: payment.orderId,
        amount: payment.amount.toString(),
        reason: 'LiqPay reversed payment',
        stores: getUniqueOrderStoresForRisk(payment),
      }).catch((error) => {
        logError('payments:webhook:refund-risk-signal', error)
      })
    }
  } else if (
    parsedEvent.status === PaymentStatus.FAILED ||
    parsedEvent.status === PaymentStatus.CANCELLED
  ) {
    if (payment.status !== PaymentStatus.FAILED && payment.status !== PaymentStatus.CANCELLED) {
      await applyFailedPayment({
        paymentId: payment.id,
        status: parsedEvent.status as 'FAILED' | 'CANCELLED',
      })

      void emitPaymentFailedEmailEvent({ paymentId: payment.id }).catch((error) => {
        logError('payments:webhook:payment-failed-email', error)
      })
      void emitPaymentFailedNotificationEvent({ paymentId: payment.id }).catch((error) => {
        logError('payments:webhook:payment-failed-notification', error)
      })
      void recordPaymentFailedRiskSignal({
        paymentId: payment.id,
        userId: payment.order.userId,
        orderId: payment.orderId,
        paymentMethod: payment.method,
        paymentProvider: payment.provider,
      }).catch((error) => {
        logError('payments:webhook:payment-failed-risk-signal', error)
      })
    }
  } else if (
    parsedEvent.status !== PaymentStatus.PROCESSING &&
    parsedEvent.status !== PaymentStatus.PENDING
  ) {
    throw new InvalidPaymentTransitionError(payment.status, parsedEvent.status)
  }

  await createPaymentAttempt({
    paymentId: payment.id,
    provider: parsedEvent.provider,
    status: parsedEvent.status,
    amount: new Decimal(parsedEvent.amount ?? payment.amount.toString()),
    requestPayload: parsedEvent.payload as never,
    responsePayload: parsedEvent.payload as never,
  })

  await markWebhookProcessed(webhookEvent.id, new Date())

  return {
    provider,
    providerEventId: parsedEvent.providerEventId,
    paymentId: payment.id,
    status: parsedEvent.status,
    duplicate: false,
  }
}

export function createCheckoutIdentifiers() {
  return {
    orderId: randomUUID(),
    paymentId: randomUUID(),
  }
}
