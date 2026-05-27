import Decimal from 'decimal.js'
import { PaymentMethod, PaymentProvider, PaymentStatus } from '@/app/generated/prisma/client'
import { requireAdmin } from '@/lib/auth/guards'
import type { SessionUser } from '@/features/auth/auth.dto'
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
  listPayments,
  markManualPaymentSucceeded,
  markWebhookProcessed,
} from './payment.repository'
import {
  InvalidPaymentTransitionError,
  PaymentAmountMismatchError,
  PaymentNotFoundError,
  PaymentWebhookDuplicateError,
  PaymentWebhookSignatureError,
} from '@/lib/errors/payment'
import type {
  CheckoutPaymentMethod,
  ParsedPaymentWebhookEvent,
  PaymentDetailDto,
  PaymentDiagnosticsQueryDto,
  PaymentDto,
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

function toPaymentDto(payment: PaymentRecord): PaymentDto {
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

export async function prepareCheckoutPayment(
  method: CheckoutPaymentMethod,
  totalAmount: Decimal,
  orderReference: string,
): Promise<PreparedPaymentDraft> {
  const adapter = getPaymentProviderAdapterForMethod(method as PaymentMethod)

  return adapter.createPayment({
    method,
    amount: totalAmount.toFixed(2),
    currency: 'UAH',
    orderReference,
  })
}

export function resolveCheckoutOrderStatus(method: CheckoutPaymentMethod) {
  return method === PaymentMethod.CASH_ON_DELIVERY ? 'confirmed' : 'pending'
}

function assertAdmin(user: SessionUser) {
  requireAdmin(user)
}

function assertPaymentAmountMatchesOrder(event: ParsedPaymentWebhookEvent, payment: PaymentRecord) {
  const orderTotal = new Decimal(payment.order.totalAmount.toString())
  const paymentAmount = new Decimal(payment.amount.toString())

  if (!paymentAmount.equals(orderTotal)) {
    throw new PaymentAmountMismatchError()
  }

  if (event.amount && !new Decimal(event.amount).equals(paymentAmount)) {
    throw new PaymentAmountMismatchError('Webhook payment amount does not match the stored payment record')
  }

  if (event.currency && event.currency !== payment.currency) {
    throw new PaymentAmountMismatchError('Webhook currency does not match the stored payment record')
  }
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

  await createRefundRecord({
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

  assertPaymentAmountMatchesOrder(parsedEvent, payment)

  if (parsedEvent.status === PaymentStatus.SUCCEEDED) {
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      await applySuccessfulPayment({
        paymentId: payment.id,
        paidAt: new Date(),
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
