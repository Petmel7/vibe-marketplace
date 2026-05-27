import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  listPayments: vi.fn(),
  markManualPaymentSucceeded: vi.fn(),
  markWebhookProcessed: vi.fn(),
}))
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn(),
}))

import * as repo from '@/features/payments/payment.repository'
import * as authGuards from '@/lib/auth/guards'
import {
  getAdminPayments,
  markManualPaymentPaid,
  prepareCheckoutPayment,
  processPaymentWebhook,
  refundPaymentByAdmin,
} from '@/features/payments/payment.service'
import {
  PaymentAmountMismatchError,
  PaymentNotFoundError,
  PaymentWebhookDuplicateError,
  PaymentWebhookSignatureError,
} from '@/lib/errors/payment'
import type { SessionUser } from '@/features/auth/auth.dto'

const mockRepo = vi.mocked(repo)
const mockAuthGuards = vi.mocked(authGuards)

const adminUser: SessionUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  roles: ['ADMIN'],
}

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: '99999999-9999-4999-8999-999999999999',
    orderId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    provider: 'MANUAL',
    providerPaymentId: 'manual:checkout-1',
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
      status: 'pending',
      totalAmount: { toString: () => '99.98' },
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
})

describe('prepareCheckoutPayment', () => {
  it('creates a cash on delivery draft with pending status', async () => {
    const result = await prepareCheckoutPayment('CASH_ON_DELIVERY', {
      toFixed: () => '99.98',
    } as never, 'checkout-1')

    expect(result.method).toBe('CASH_ON_DELIVERY')
    expect(result.provider).toBe('MANUAL')
    expect(result.status).toBe('PENDING')
    expect(result.nextAction).toBe('AWAITING_CASH_ON_DELIVERY')
  })

  it('creates a card skeleton payment draft', async () => {
    const result = await prepareCheckoutPayment('CARD', {
      toFixed: () => '99.98',
    } as never, 'checkout-1')

    expect(result.method).toBe('CARD')
    expect(result.status).toBe('PROCESSING')
    expect(result.provider).toBe('LIQPAY')
    expect(result.nextAction).toBe('AWAITING_PROVIDER_CONFIRMATION')
  })
})

describe('processPaymentWebhook', () => {
  it('marks a payment succeeded when a verified webhook confirms it', async () => {
    mockRepo.findPaymentByProviderPaymentId.mockResolvedValue(
      makePayment({
        provider: 'LIQPAY',
        providerPaymentId: 'liqpay:checkout-1',
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
        providerPaymentId: 'liqpay:checkout-1',
        method: 'CARD',
        status: 'SUCCEEDED',
      }),
      order: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'paid' },
    } as never)

    const result = await processPaymentWebhook('LIQPAY', {
      headers: { 'x-payment-test-signature': 'card-skeleton' },
      rawBody: JSON.stringify({
        providerEventId: 'event-1',
        providerPaymentId: 'liqpay:checkout-1',
        eventType: 'payment.succeeded',
        amount: '99.98',
        currency: 'UAH',
        status: 'SUCCEEDED',
      }),
    })

    expect(mockRepo.applySuccessfulPayment).toHaveBeenCalled()
    expect(mockRepo.markWebhookProcessed).toHaveBeenCalledWith('webhook-1', expect.any(Date))
    expect(result.status).toBe('SUCCEEDED')
    expect(result.duplicate).toBe(false)
  })

  it('ignores duplicate webhooks safely', async () => {
    mockRepo.findPaymentByProviderPaymentId.mockResolvedValue(
      makePayment({
        provider: 'LIQPAY',
        providerPaymentId: 'liqpay:checkout-1',
        method: 'CARD',
      }) as never,
    )
    mockRepo.createPaymentWebhookEvent.mockRejectedValue(new PaymentWebhookDuplicateError())

    const result = await processPaymentWebhook('LIQPAY', {
      headers: { 'x-payment-test-signature': 'card-skeleton' },
      rawBody: JSON.stringify({
        providerEventId: 'event-dup',
        providerPaymentId: 'liqpay:checkout-1',
        eventType: 'payment.succeeded',
        amount: '99.98',
        currency: 'UAH',
        status: 'SUCCEEDED',
      }),
    })

    expect(result.duplicate).toBe(true)
    expect(result.status).toBe('IGNORED')
  })

  it('rejects invalid webhook signatures', async () => {
    await expect(
      processPaymentWebhook('LIQPAY', {
        headers: { 'x-payment-test-signature': 'bad-signature' },
        rawBody: JSON.stringify({
          providerEventId: 'event-1',
          providerPaymentId: 'liqpay:checkout-1',
          eventType: 'payment.succeeded',
          amount: '99.98',
          currency: 'UAH',
          status: 'SUCCEEDED',
        }),
      }),
    ).rejects.toThrow(PaymentWebhookSignatureError)
  })

  it('blocks webhook reconciliation when amount does not match the order total', async () => {
    mockRepo.findPaymentByProviderPaymentId.mockResolvedValue(
      makePayment({
        provider: 'LIQPAY',
        providerPaymentId: 'liqpay:checkout-1',
        method: 'CARD',
        status: 'PROCESSING',
      }) as never,
    )
    mockRepo.createPaymentWebhookEvent.mockResolvedValue({
      id: 'webhook-2',
    } as never)

    await expect(
      processPaymentWebhook('LIQPAY', {
        headers: { 'x-payment-test-signature': 'card-skeleton' },
        rawBody: JSON.stringify({
          providerEventId: 'event-2',
          providerPaymentId: 'liqpay:checkout-1',
          eventType: 'payment.succeeded',
          amount: '10.00',
          currency: 'UAH',
          status: 'SUCCEEDED',
        }),
      }),
    ).rejects.toThrow(PaymentAmountMismatchError)
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
  })

  it('throws when admin asks for a payment that does not exist', async () => {
    mockRepo.findPaymentById.mockResolvedValue(null)

    await expect(
      markManualPaymentPaid(adminUser, '99999999-9999-4999-8999-999999999999'),
    ).rejects.toThrow(PaymentNotFoundError)
  })
})
