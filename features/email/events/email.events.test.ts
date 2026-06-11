import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/email/queue/email.queue', () => ({
  enqueueEmailEvent: vi.fn(),
}))
vi.mock('@/features/email/email.repository', () => ({
  findAdminEmailRecipients: vi.fn(),
  findOrderNotificationContext: vi.fn(),
  findPaymentNotificationContext: vi.fn(),
  findProductNotificationContext: vi.fn(),
  findRefundRequestNotificationContext: vi.fn(),
  findUserNotificationContext: vi.fn(),
}))

import * as queue from '@/features/email/queue/email.queue'
import * as repository from '@/features/email/email.repository'
import {
  emitOrderCreatedEmailEvent,
  emitPaymentFailedEmailEvent,
  emitPaymentSucceededEmailEvent,
  emitRefundApprovedEmailEvent,
  emitRefundFailedEmailEvent,
  emitRefundRejectedEmailEvent,
  emitRefundRequestedEmailEvents,
  emitRefundSucceededEmailEvents,
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

function makeRefundRequestContext(overrides: Record<string, unknown> = {}) {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    orderId: '11111111-1111-4111-8111-111111111111',
    orderItemId: 'item-1',
    reason: 'ITEM_NOT_AS_DESCRIBED',
    status: 'REQUESTED',
    amount: { toString: () => '90.00' },
    currency: 'UAH',
    adminNote: 'Safe seller-facing note',
    requestedById: '22222222-2222-4222-8222-222222222222',
    requestedBy: {
      id: '22222222-2222-4222-8222-222222222222',
      email: 'buyer@example.com',
      name: 'Olena',
      profile: {
        displayName: 'Olena Buyer',
      },
    },
    order: {
      id: '11111111-1111-4111-8111-111111111111',
      status: 'paid',
    },
    payment: {
      id: 'payment-1',
      status: 'SUCCEEDED',
    },
    orderItem: {
      id: 'item-1',
      productNameSnapshot: 'Blue Hoodie',
      store: {
        id: '55555555-5555-4555-8555-555555555555',
        name: 'North Store',
        ownerId: '66666666-6666-4666-8666-666666666666',
        owner: {
          id: '66666666-6666-4666-8666-666666666666',
          email: 'seller@example.com',
          name: 'Seller One',
          profile: {
            displayName: 'Seller One',
          },
        },
      },
    },
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.APP_URL = 'https://app.example.com'
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
  mockRepository.findAdminEmailRecipients.mockResolvedValue([
    {
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin User',
      profile: { displayName: 'Admin User' },
    },
  ] as never)
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

  it('enqueues refund requested emails for buyer, seller, and admin', async () => {
    mockRepository.findRefundRequestNotificationContext.mockResolvedValue(
      makeRefundRequestContext() as never,
    )

    await emitRefundRequestedEmailEvents({
      refundRequestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    })

    expect(mockQueue.enqueueEmailEvent).toHaveBeenCalledTimes(3)
    expect(mockQueue.enqueueEmailEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        eventType: 'REFUND_REQUESTED',
        dedupeKey: 'refund-requested:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:buyer',
        recipientEmail: 'buyer@example.com',
        template: 'REFUND_REQUESTED_EMAIL',
      }),
    )
    expect(mockQueue.enqueueEmailEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        dedupeKey:
          'refund-requested:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:seller:55555555-5555-4555-8555-555555555555',
        recipientEmail: 'seller@example.com',
      }),
    )
    expect(mockQueue.enqueueEmailEvent).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        dedupeKey: 'refund-requested:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:admin',
        recipientEmail: 'admin@example.com',
      }),
    )
  })

  it('enqueues refund approved email for buyer', async () => {
    mockRepository.findRefundRequestNotificationContext.mockResolvedValue(
      makeRefundRequestContext({ status: 'APPROVED' }) as never,
    )

    await emitRefundApprovedEmailEvent({
      refundRequestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    })

    expect(mockQueue.enqueueEmailEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'REFUND_APPROVED',
        dedupeKey: 'refund-approved:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:buyer',
      }),
    )
  })

  it('enqueues refund rejected email with safe admin note for buyer', async () => {
    mockRepository.findRefundRequestNotificationContext.mockResolvedValue(
      makeRefundRequestContext({
        status: 'REJECTED',
        adminNote: 'Visible rejection reason',
      }) as never,
    )

    await emitRefundRejectedEmailEvent({
      refundRequestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    })

    expect(mockQueue.enqueueEmailEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'REFUND_REJECTED',
        dedupeKey: 'refund-rejected:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:buyer',
        payload: expect.objectContaining({
          adminNote: 'Visible rejection reason',
        }),
      }),
    )
  })

  it('enqueues refund succeeded emails for buyer and seller', async () => {
    mockRepository.findRefundRequestNotificationContext.mockResolvedValue(
      makeRefundRequestContext({ status: 'SUCCEEDED' }) as never,
    )

    await emitRefundSucceededEmailEvents({
      refundRequestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    })

    expect(mockQueue.enqueueEmailEvent).toHaveBeenCalledTimes(2)
    expect(mockQueue.enqueueEmailEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        eventType: 'REFUND_SUCCEEDED',
        dedupeKey: 'refund-succeeded:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:buyer',
      }),
    )
    expect(mockQueue.enqueueEmailEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        dedupeKey:
          'refund-succeeded:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:seller:55555555-5555-4555-8555-555555555555',
      }),
    )
  })

  it('enqueues refund failed email for buyer', async () => {
    mockRepository.findRefundRequestNotificationContext.mockResolvedValue(
      makeRefundRequestContext({ status: 'FAILED' }) as never,
    )

    await emitRefundFailedEmailEvent({
      refundRequestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    })

    expect(mockQueue.enqueueEmailEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'REFUND_FAILED',
        dedupeKey: 'refund-failed:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:buyer',
      }),
    )
  })

  it('uses stable refund dedupe keys across repeated lifecycle event calls', async () => {
    mockRepository.findRefundRequestNotificationContext.mockResolvedValue(
      makeRefundRequestContext({ status: 'SUCCEEDED' }) as never,
    )

    await emitRefundSucceededEmailEvents({
      refundRequestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    })
    await emitRefundSucceededEmailEvents({
      refundRequestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    })

    expect(mockQueue.enqueueEmailEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        dedupeKey: 'refund-succeeded:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:buyer',
      }),
    )
    expect(mockQueue.enqueueEmailEvent).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        dedupeKey: 'refund-succeeded:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:buyer',
      }),
    )
  })
})
