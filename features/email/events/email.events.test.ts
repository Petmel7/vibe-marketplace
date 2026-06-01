import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/email/queue/email.queue', () => ({
  enqueueEmailEvent: vi.fn(),
}))
vi.mock('@/features/email/email.repository', () => ({
  findOrderNotificationContext: vi.fn(),
  findPaymentNotificationContext: vi.fn(),
  findProductNotificationContext: vi.fn(),
  findUserNotificationContext: vi.fn(),
}))

import * as queue from '@/features/email/queue/email.queue'
import * as repository from '@/features/email/email.repository'
import {
  emitOrderCreatedEmailEvent,
  emitPaymentFailedEmailEvent,
  emitPaymentSucceededEmailEvent,
  emitSellerNewOrderEmailEvents,
} from './email.events'

const mockQueue = vi.mocked(queue)
const mockRepository = vi.mocked(repository)

function makeOrderContext() {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    userId: '22222222-2222-4222-8222-222222222222',
    status: 'confirmed',
    totalAmount: { toString: () => '199.98' },
    shippingAddressId: '33333333-3333-4333-8333-333333333333',
    shippingAddressName: 'Olena Buyer',
    user: {
      email: 'buyer@example.com',
      name: 'Olena',
      profile: {
        displayName: 'Olena Buyer',
      },
    },
    payments: [
      {
        id: '44444444-4444-4444-8444-444444444444',
        provider: 'MANUAL',
        method: 'CASH_ON_DELIVERY',
        status: 'PENDING',
        failureReason: null,
        paidAt: null,
      },
    ],
    items: [
      {
        id: 'item-1',
        quantity: 1,
        storeId: '55555555-5555-4555-8555-555555555555',
        productNameSnapshot: 'Blue Hoodie',
        variantSnapshot: 'L / Blue',
        storeNameSnapshot: 'North Store',
        unitPriceSnapshot: { toString: () => '99.99' },
        store: {
          id: '55555555-5555-4555-8555-555555555555',
          name: 'North Store',
          slug: 'north-store',
          ownerId: '66666666-6666-4666-8666-666666666666',
          owner: {
            email: 'seller@example.com',
            name: 'Seller One',
            profile: {
              displayName: 'Seller One',
            },
          },
        },
      },
      {
        id: 'item-2',
        quantity: 1,
        storeId: '77777777-7777-4777-8777-777777777777',
        productNameSnapshot: 'Red Tee',
        variantSnapshot: 'M / Red',
        storeNameSnapshot: 'South Store',
        unitPriceSnapshot: { toString: () => '99.99' },
        store: {
          id: '77777777-7777-4777-8777-777777777777',
          name: 'South Store',
          slug: 'south-store',
          ownerId: '88888888-8888-4888-8888-888888888888',
          owner: {
            email: 'seller-2@example.com',
            name: 'Seller Two',
            profile: {
              displayName: 'Seller Two',
            },
          },
        },
      },
    ],
  }
}

function makePaymentContext(overrides: Record<string, unknown> = {}) {
  return {
    id: '99999999-9999-4999-8999-999999999999',
    provider: 'LIQPAY',
    method: 'CARD',
    status: 'SUCCEEDED',
    amount: { toString: () => '199.98' },
    currency: 'UAH',
    failureReason: null,
    paidAt: new Date('2026-01-01T10:00:00.000Z'),
    orderId: '11111111-1111-4111-8111-111111111111',
    order: makeOrderContext(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
  mockQueue.enqueueEmailEvent.mockImplementation(async (input) => ({
    id: 'event-1',
    eventType: input.eventType,
    dedupeKey: input.dedupeKey,
    recipientEmail: input.recipientEmail,
    recipientUserId: input.recipientUserId ?? null,
    template: input.template,
    payload: input.payload,
    status: 'PENDING',
    attempts: 0,
    maxAttempts: 3,
    nextAttemptAt: null,
    processedAt: null,
    failedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }))
})

describe('email lifecycle events', () => {
  it('enqueues buyer order created email with server-side order data', async () => {
    mockRepository.findOrderNotificationContext.mockResolvedValue(makeOrderContext() as never)

    await emitOrderCreatedEmailEvent({
      orderId: '11111111-1111-4111-8111-111111111111',
    })

    expect(mockQueue.enqueueEmailEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'ORDER_CREATED',
        dedupeKey: 'order-created:11111111-1111-4111-8111-111111111111:22222222-2222-4222-8222-222222222222',
        recipientEmail: 'buyer@example.com',
        template: 'ORDER_CREATED_EMAIL',
        payload: expect.objectContaining({
          buyerName: 'Olena Buyer',
          itemCount: 2,
          orderDetailsUrl: 'https://app.example.com/profile/orders/11111111-1111-4111-8111-111111111111',
          paymentMethod: 'CASH_ON_DELIVERY',
          paymentStatus: 'PENDING',
          storeNames: ['North Store', 'South Store'],
        }),
      }),
    )
  })

  it('enqueues buyer payment succeeded email with payment metadata', async () => {
    mockRepository.findPaymentNotificationContext.mockResolvedValue(makePaymentContext() as never)

    await emitPaymentSucceededEmailEvent({
      paymentId: '99999999-9999-4999-8999-999999999999',
    })

    expect(mockQueue.enqueueEmailEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'PAYMENT_SUCCEEDED',
        dedupeKey: 'payment-succeeded:99999999-9999-4999-8999-999999999999:22222222-2222-4222-8222-222222222222',
        template: 'PAYMENT_SUCCEEDED_EMAIL',
        payload: expect.objectContaining({
          paymentId: '99999999-9999-4999-8999-999999999999',
          paymentProvider: 'LIQPAY',
          paymentStatus: 'SUCCEEDED',
        }),
      }),
    )
  })

  it('enqueues buyer payment failed email with failure reason', async () => {
    mockRepository.findPaymentNotificationContext.mockResolvedValue(
      makePaymentContext({
        status: 'FAILED',
        failureReason: 'Card declined',
        paidAt: null,
      }) as never,
    )

    await emitPaymentFailedEmailEvent({
      paymentId: '99999999-9999-4999-8999-999999999999',
    })

    expect(mockQueue.enqueueEmailEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'PAYMENT_FAILED',
        dedupeKey: 'payment-failed:99999999-9999-4999-8999-999999999999:22222222-2222-4222-8222-222222222222',
        template: 'PAYMENT_FAILED_EMAIL',
        payload: expect.objectContaining({
          failureReason: 'Card declined',
          paymentStatus: 'FAILED',
        }),
      }),
    )
  })

  it('enqueues one paid-order seller email per store', async () => {
    mockRepository.findPaymentNotificationContext.mockResolvedValue(makePaymentContext() as never)

    await emitSellerNewOrderEmailEvents({
      paymentId: '99999999-9999-4999-8999-999999999999',
    })

    expect(mockQueue.enqueueEmailEvent).toHaveBeenCalledTimes(2)
    expect(mockQueue.enqueueEmailEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        eventType: 'SELLER_NEW_ORDER',
        dedupeKey: 'seller-new-order:11111111-1111-4111-8111-111111111111:55555555-5555-4555-8555-555555555555',
        recipientEmail: 'seller@example.com',
        template: 'SELLER_NEW_ORDER_EMAIL',
        payload: expect.objectContaining({
          buyerEmail: 'buyer@example.com',
          storeName: 'North Store',
          paymentStatus: 'SUCCEEDED',
        }),
      }),
    )
  })
})
