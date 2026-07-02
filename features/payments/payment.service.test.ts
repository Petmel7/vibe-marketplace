import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PaymentProvider } from '@/app/generated/prisma/client'

vi.mock('@/features/payments/payment.repository', () => ({
  applyFailedPayment: vi.fn(),
  applyRefundOutcome: vi.fn(),
  applySuccessfulPayment: vi.fn(),
  countPayments: vi.fn(),
  createPaymentAttempt: vi.fn(),
  createPaymentWebhookEvent: vi.fn(),
  createRefundRecord: vi.fn(),
  findPaymentById: vi.fn(),
  findPaymentByProviderPaymentId: vi.fn(),
  findPaymentCheckoutSessionById: vi.fn(),
  listPayments: vi.fn(),
  markManualPaymentSucceeded: vi.fn(),
  markWebhookProcessed: vi.fn(),
}))
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn(),
}))
vi.mock('@/features/email/events/email.events', () => ({
  emitPaymentFailedEmailEvent: vi.fn(),
  emitPaymentSucceededEmailEvent: vi.fn(),
  emitSellerNewOrderEmailEvents: vi.fn(),
}))
vi.mock('@/features/notifications/events/notification.events', () => ({
  emitPaymentFailedNotificationEvent: vi.fn(),
  emitPaymentSucceededNotificationEvent: vi.fn(),
  emitSellerNewOrderNotificationEvents: vi.fn(),
}))
vi.mock('@/features/risk/risk.service', () => ({
  recordPaymentFailedRiskSignal: vi.fn(),
  recordRefundIssuedRiskSignals: vi.fn(),
}))
vi.mock('@/features/payouts/payouts.service', () => ({
  materializeSellerFinanceForOrderAction: vi.fn(),
}))
vi.mock('@/features/products/product-metrics.jobs', () => ({
  scheduleProductMetricsRecalculation: vi.fn(),
}))
vi.mock('@/features/admin/audit/admin-audit', () => ({
  recordAdminAudit: vi.fn(),
}))

import * as repo from '@/features/payments/payment.repository'
import * as authGuards from '@/lib/auth/guards'
import * as emailEvents from '@/features/email/events/email.events'
import * as notificationEvents from '@/features/notifications/events/notification.events'
import * as riskService from '@/features/risk/risk.service'
import * as payoutService from '@/features/payouts/payouts.service'
import * as productMetricsJobs from '@/features/products/product-metrics.jobs'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import {
  getAdminPayments,
  markManualPaymentPaid,
  prepareCheckoutPayment,
  processPaymentWebhook,
  refundPaymentByAdmin,
} from '@/features/payments/payment.service'
import {
  LiqPayAmountMismatchError,
  LiqPaySignatureError,
  PaymentNotFoundError,
  PaymentWebhookDuplicateError,
} from '@/lib/errors/payment'
import type { SessionUser } from '@/features/auth/auth.dto'

const mockRepo = vi.mocked(repo)
const mockAuthGuards = vi.mocked(authGuards)
const mockEmailEvents = vi.mocked(emailEvents)
const mockNotificationEvents = vi.mocked(notificationEvents)
const mockRiskService = vi.mocked(riskService)
const mockPayoutService = vi.mocked(payoutService)
const mockProductMetricsJobs = vi.mocked(productMetricsJobs)
const mockRecordAdminAudit = vi.mocked(recordAdminAudit)

const adminUser: SessionUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  roles: ['ADMIN'],
}

const LIQPAY_PRIVATE_KEY = 'test-private-key'

function sign(data: string) {
  return createHash('sha1')
    .update(`${LIQPAY_PRIVATE_KEY}${data}${LIQPAY_PRIVATE_KEY}`, 'utf8')
    .digest('base64')
}

function makeLiqPayRawBody(
  payload: Record<string, unknown>,
  overrideSignature?: string,
) {
  const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
  const signature = overrideSignature ?? sign(data)

  return new URLSearchParams({ data, signature }).toString()
}

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: '99999999-9999-4999-8999-999999999999',
    orderId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    provider: 'MANUAL',
    providerPaymentId: '99999999-9999-4999-8999-999999999999',
    status: 'PENDING',
    method: 'MANUAL',
    amount: { toString: () => '99.98' },
    currency: 'UAH',
    checkoutUrl: null,
    failureReason: null,
    paidAt: null,
    expiresAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    order: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: 'buyer-1',
      status: 'pending',
      totalAmount: { toString: () => '99.98' },
      items: [
        {
          storeId: 'store-1',
          store: {
            id: 'store-1',
            ownerId: 'seller-1',
            name: 'Store 1',
          },
        },
      ],
    },
    attempts: [],
    refunds: [],
    webhookEvents: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockAuthGuards.requireAdmin.mockReturnValue(undefined)
  mockEmailEvents.emitPaymentFailedEmailEvent.mockResolvedValue(null)
  mockEmailEvents.emitPaymentSucceededEmailEvent.mockResolvedValue(null)
  mockEmailEvents.emitSellerNewOrderEmailEvents.mockResolvedValue([])
  mockNotificationEvents.emitPaymentFailedNotificationEvent.mockResolvedValue(null)
  mockNotificationEvents.emitPaymentSucceededNotificationEvent.mockResolvedValue(null)
  mockNotificationEvents.emitSellerNewOrderNotificationEvents.mockResolvedValue([])
  mockRiskService.recordPaymentFailedRiskSignal.mockResolvedValue(null as never)
  mockRiskService.recordRefundIssuedRiskSignals.mockResolvedValue([] as never)
  mockPayoutService.materializeSellerFinanceForOrderAction.mockResolvedValue({
    orderId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    createdCommissionCount: 1,
    createdLedgerEntryCount: 1,
    skippedOrderItemCount: 0,
  } as never)
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.LIQPAY_PUBLIC_KEY = 'test-public-key'
  process.env.LIQPAY_PRIVATE_KEY = LIQPAY_PRIVATE_KEY
  process.env.LIQPAY_SANDBOX = 'false'
  process.env.APP_URL = 'https://app.example.com'
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
})

describe('prepareCheckoutPayment', () => {
  it('creates a cash on delivery draft with pending status', async () => {
    const result = await prepareCheckoutPayment(
      'CASH_ON_DELIVERY',
      { toFixed: () => '99.98' } as never,
      'checkout-1',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    )

    expect(result.method).toBe('CASH_ON_DELIVERY')
    expect(result.provider).toBe('MANUAL')
    expect(result.status).toBe('PENDING')
    expect(result.nextAction).toBe('AWAITING_CASH_ON_DELIVERY')
    expect(result.checkoutAction).toBeNull()
  })

  it('creates a real LiqPay hosted payment draft for card checkout', async () => {
    const result = await prepareCheckoutPayment(
      'CARD',
      { toFixed: () => '99.98' } as never,
      'checkout-1',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    )

    expect(result.method).toBe('CARD')
    expect(result.status).toBe('PROCESSING')
    expect(result.provider).toBe('LIQPAY')
    expect(result.nextAction).toBe('AWAITING_PROVIDER_CONFIRMATION')
    expect(result.checkoutUrl).toBe(
      'https://app.example.com/api/payments/checkout/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    )
    expect(result.checkoutAction).toMatchObject({
      provider: 'LIQPAY',
      checkoutAction: 'POST_FORM',
      checkoutUrl: 'https://www.liqpay.ua/api/3/checkout',
      paymentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      orderId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    })
  })
})

describe('processPaymentWebhook', () => {
  it('marks a payment succeeded when a verified LiqPay webhook confirms it', async () => {
    mockRepo.findPaymentByProviderPaymentId.mockResolvedValue(
      makePayment({
        provider: 'LIQPAY',
        providerPaymentId: '99999999-9999-4999-8999-999999999999',
        method: 'CARD',
        status: 'PROCESSING',
      }) as never,
    )
    mockRepo.createPaymentWebhookEvent.mockResolvedValue({
      id: 'webhook-1',
    } as never)
    mockRepo.applySuccessfulPayment.mockResolvedValue({
      payment: makePayment({
        provider: 'LIQPAY',
        providerPaymentId: '99999999-9999-4999-8999-999999999999',
        method: 'CARD',
        status: 'SUCCEEDED',
      }),
      order: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'paid' },
    } as never)

    const result = await processPaymentWebhook(PaymentProvider.LIQPAY, {
      headers: {},
      rawBody: makeLiqPayRawBody({
        order_id: '99999999-9999-4999-8999-999999999999',
        payment_id: 'liqpay-payment-1',
        transaction_id: 'event-1',
        type: 'buy',
        amount: '99.98',
        currency: 'UAH',
        status: 'success',
      }),
    })

    expect(mockRepo.applySuccessfulPayment).toHaveBeenCalled()
    expect(mockEmailEvents.emitPaymentSucceededEmailEvent).toHaveBeenCalledWith({
      paymentId: '99999999-9999-4999-8999-999999999999',
    })
    expect(mockNotificationEvents.emitPaymentSucceededNotificationEvent).toHaveBeenCalledWith({
      paymentId: '99999999-9999-4999-8999-999999999999',
    })
    expect(mockEmailEvents.emitSellerNewOrderEmailEvents).toHaveBeenCalledWith({
      paymentId: '99999999-9999-4999-8999-999999999999',
    })
    expect(mockNotificationEvents.emitSellerNewOrderNotificationEvents).toHaveBeenCalledWith({
      paymentId: '99999999-9999-4999-8999-999999999999',
    })
    expect(mockPayoutService.materializeSellerFinanceForOrderAction).toHaveBeenCalledWith(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    )
    expect(mockProductMetricsJobs.scheduleProductMetricsRecalculation).toHaveBeenCalledWith({
      reason: 'order-paid-webhook',
      dedupeKey: 'product-metrics:order-paid:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    })
    expect(mockRecordAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'buyer-1',
        actorRole: 'BUYER',
        domain: 'payments',
        action: 'succeeded',
        targetType: 'payment',
        targetId: '99999999-9999-4999-8999-999999999999',
        metadata: {
          orderId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          provider: 'LIQPAY',
          amount: '99.98',
          currency: 'UAH',
        },
      }),
    )
    expect(mockRepo.markWebhookProcessed).toHaveBeenCalledWith('webhook-1', expect.any(Date))
    expect(result.status).toBe('SUCCEEDED')
    expect(result.duplicate).toBe(false)
  })

  it('ignores duplicate LiqPay webhooks safely', async () => {
    mockRepo.findPaymentByProviderPaymentId.mockResolvedValue(
      makePayment({
        provider: 'LIQPAY',
        providerPaymentId: '99999999-9999-4999-8999-999999999999',
        method: 'CARD',
      }) as never,
    )
    mockRepo.createPaymentWebhookEvent.mockRejectedValue(new PaymentWebhookDuplicateError())

    const result = await processPaymentWebhook(PaymentProvider.LIQPAY, {
      headers: {},
      rawBody: makeLiqPayRawBody({
        order_id: '99999999-9999-4999-8999-999999999999',
        payment_id: 'liqpay-payment-1',
        transaction_id: 'event-dup',
        type: 'buy',
        amount: '99.98',
        currency: 'UAH',
        status: 'success',
      }),
    })

    expect(result.duplicate).toBe(true)
    expect(result.status).toBe('IGNORED')
    expect(mockEmailEvents.emitPaymentSucceededEmailEvent).not.toHaveBeenCalled()
    expect(mockEmailEvents.emitSellerNewOrderEmailEvents).not.toHaveBeenCalled()
    expect(mockNotificationEvents.emitPaymentSucceededNotificationEvent).not.toHaveBeenCalled()
    expect(mockNotificationEvents.emitSellerNewOrderNotificationEvents).not.toHaveBeenCalled()
  })

  it('rejects invalid LiqPay webhook signatures', async () => {
    await expect(
      processPaymentWebhook(PaymentProvider.LIQPAY, {
        headers: {},
        rawBody: makeLiqPayRawBody(
          {
            order_id: '99999999-9999-4999-8999-999999999999',
            payment_id: 'liqpay-payment-1',
            transaction_id: 'event-1',
            amount: '99.98',
            currency: 'UAH',
            status: 'success',
          },
          'bad-signature',
        ),
      }),
    ).rejects.toThrow(LiqPaySignatureError)
  })

  it('blocks webhook reconciliation when amount does not match the order total', async () => {
    mockRepo.findPaymentByProviderPaymentId.mockResolvedValue(
      makePayment({
        provider: 'LIQPAY',
        providerPaymentId: '99999999-9999-4999-8999-999999999999',
        method: 'CARD',
        status: 'PROCESSING',
      }) as never,
    )
    mockRepo.createPaymentWebhookEvent.mockResolvedValue({
      id: 'webhook-2',
    } as never)

    await expect(
      processPaymentWebhook(PaymentProvider.LIQPAY, {
        headers: {},
        rawBody: makeLiqPayRawBody({
          order_id: '99999999-9999-4999-8999-999999999999',
          payment_id: 'liqpay-payment-1',
          transaction_id: 'event-2',
          amount: '10.00',
          currency: 'UAH',
          status: 'success',
        }),
      }),
    ).rejects.toThrow(LiqPayAmountMismatchError)
  })

  it('does not mark an order as paid when LiqPay reports a failed payment', async () => {
    mockRepo.findPaymentByProviderPaymentId.mockResolvedValue(
      makePayment({
        provider: 'LIQPAY',
        providerPaymentId: '99999999-9999-4999-8999-999999999999',
        method: 'CARD',
        status: 'PROCESSING',
      }) as never,
    )
    mockRepo.createPaymentWebhookEvent.mockResolvedValue({
      id: 'webhook-3',
    } as never)

    const result = await processPaymentWebhook(PaymentProvider.LIQPAY, {
      headers: {},
      rawBody: makeLiqPayRawBody({
        order_id: '99999999-9999-4999-8999-999999999999',
        payment_id: 'liqpay-payment-1',
        transaction_id: 'event-3',
        amount: '99.98',
        currency: 'UAH',
        status: 'failure',
      }),
    })

    expect(mockRepo.applySuccessfulPayment).not.toHaveBeenCalled()
    expect(mockRepo.applyFailedPayment).toHaveBeenCalled()
    expect(mockEmailEvents.emitPaymentFailedEmailEvent).toHaveBeenCalledWith({
      paymentId: '99999999-9999-4999-8999-999999999999',
    })
    expect(mockNotificationEvents.emitPaymentFailedNotificationEvent).toHaveBeenCalledWith({
      paymentId: '99999999-9999-4999-8999-999999999999',
    })
    expect(mockRiskService.recordPaymentFailedRiskSignal).toHaveBeenCalledWith({
      paymentId: '99999999-9999-4999-8999-999999999999',
      userId: 'buyer-1',
      orderId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      paymentMethod: 'CARD',
      paymentProvider: 'LIQPAY',
    })
    expect(result.status).toBe('FAILED')
  })

  it('does not fail webhook reconciliation when lifecycle email or notification enqueue fails', async () => {
    mockRepo.findPaymentByProviderPaymentId.mockResolvedValue(
      makePayment({
        provider: 'LIQPAY',
        providerPaymentId: '99999999-9999-4999-8999-999999999999',
        method: 'CARD',
        status: 'PROCESSING',
      }) as never,
    )
    mockRepo.createPaymentWebhookEvent.mockResolvedValue({
      id: 'webhook-4',
    } as never)
    mockRepo.applySuccessfulPayment.mockResolvedValue({
      payment: makePayment({
        provider: 'LIQPAY',
        providerPaymentId: '99999999-9999-4999-8999-999999999999',
        method: 'CARD',
        status: 'SUCCEEDED',
      }),
      order: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'paid' },
    } as never)
    mockEmailEvents.emitPaymentSucceededEmailEvent.mockRejectedValueOnce(new Error('email down'))
    mockNotificationEvents.emitPaymentSucceededNotificationEvent.mockRejectedValueOnce(new Error('notifications down'))

    const result = await processPaymentWebhook(PaymentProvider.LIQPAY, {
      headers: {},
      rawBody: makeLiqPayRawBody({
        order_id: '99999999-9999-4999-8999-999999999999',
        payment_id: 'liqpay-payment-1',
        transaction_id: 'event-4',
        type: 'buy',
        amount: '99.98',
        currency: 'UAH',
        status: 'success',
      }),
    })

    expect(result.status).toBe('SUCCEEDED')
    expect(mockRepo.markWebhookProcessed).toHaveBeenCalledWith('webhook-4', expect.any(Date))
  })
})

describe('admin payment mutations', () => {
  it('allows admins to mark manual payments as paid', async () => {
    mockRepo.findPaymentById.mockResolvedValue(
      makePayment() as never,
    )
    mockRepo.markManualPaymentSucceeded.mockResolvedValue({
      payment: makePayment({
        status: 'SUCCEEDED',
        paidAt: new Date('2026-01-01T01:00:00.000Z'),
      }),
      order: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'paid' },
    } as never)
    mockRepo.findPaymentById.mockResolvedValueOnce(makePayment() as never).mockResolvedValueOnce(
      makePayment({
        status: 'SUCCEEDED',
        paidAt: new Date('2026-01-01T01:00:00.000Z'),
      }) as never,
    )

    const result = await markManualPaymentPaid(adminUser, '99999999-9999-4999-8999-999999999999')

    expect(result.status).toBe('SUCCEEDED')
    expect(mockRepo.markManualPaymentSucceeded).toHaveBeenCalled()
    expect(mockProductMetricsJobs.scheduleProductMetricsRecalculation).toHaveBeenCalledWith({
      reason: 'order-paid-manual',
      dedupeKey: 'product-metrics:order-paid:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    })
  })

  it('prevents non-admin users from mutating payments', async () => {
    mockAuthGuards.requireAdmin.mockImplementation(() => {
      throw new Error('forbidden')
    })

    await expect(
      markManualPaymentPaid(adminUser, '99999999-9999-4999-8999-999999999999'),
    ).rejects.toThrow('forbidden')
  })

  it('returns paginated payment diagnostics', async () => {
    mockRepo.listPayments.mockResolvedValue([
      makePayment(),
    ] as never)
    mockRepo.countPayments.mockResolvedValue(1)

    const result = await getAdminPayments(adminUser, { page: 1, limit: 20 })

    expect(result.total).toBe(1)
    expect(result.items[0]?.orderStatus).toBe('pending')
  })

  it('supports manual refund skeletons', async () => {
    mockRepo.findPaymentById.mockResolvedValue(
      makePayment({
        status: 'SUCCEEDED',
      }) as never,
    )
    mockRepo.createRefundRecord.mockResolvedValue({ id: 'refund-1' } as never)
    mockRepo.applyRefundOutcome.mockResolvedValue(makePayment({
      status: 'REFUNDED',
      refunds: [{
        id: 'refund-1',
        paymentId: '99999999-9999-4999-8999-999999999999',
        orderItemId: null,
        providerRefundId: 'manual-refund:99999999-9999-4999-8999-999999999999',
        status: 'SUCCEEDED',
        amount: { toString: () => '99.98' },
        reason: 'Admin test refund',
        createdAt: new Date('2026-01-01T02:00:00.000Z'),
        updatedAt: new Date('2026-01-01T02:00:00.000Z'),
      }],
    }) as never)
    mockRepo.findPaymentById
      .mockResolvedValueOnce(makePayment({ status: 'SUCCEEDED' }) as never)
      .mockResolvedValueOnce(
        makePayment({
          status: 'REFUNDED',
          refunds: [{
            id: 'refund-1',
            paymentId: '99999999-9999-4999-8999-999999999999',
            orderItemId: null,
            providerRefundId: 'manual-refund:99999999-9999-4999-8999-999999999999',
            status: 'SUCCEEDED',
            amount: { toString: () => '99.98' },
            reason: 'Admin test refund',
            createdAt: new Date('2026-01-01T02:00:00.000Z'),
            updatedAt: new Date('2026-01-01T02:00:00.000Z'),
          }],
        }) as never,
      )

    const result = await refundPaymentByAdmin(adminUser, '99999999-9999-4999-8999-999999999999', {
      reason: 'Admin test refund',
    })

    expect(result.status).toBe('REFUNDED')
    expect(mockRiskService.recordRefundIssuedRiskSignals).toHaveBeenCalledWith(
      expect.objectContaining({
        refundId: 'refund-1',
        orderId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      }),
    )
  })

  it('throws when admin asks for a payment that does not exist', async () => {
    mockRepo.findPaymentById.mockResolvedValue(null)

    await expect(
      markManualPaymentPaid(adminUser, '99999999-9999-4999-8999-999999999999'),
    ).rejects.toThrow(PaymentNotFoundError)
  })
})
