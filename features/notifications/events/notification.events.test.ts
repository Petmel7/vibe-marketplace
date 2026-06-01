import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/email/email.repository', () => ({
  findOrderNotificationContext: vi.fn(),
  findPaymentNotificationContext: vi.fn(),
  findProductNotificationContext: vi.fn(),
}))
vi.mock('@/features/notifications/notifications.service', () => ({
  createOrderNotification: vi.fn(),
  createPaymentNotification: vi.fn(),
  createSellerNotification: vi.fn(),
  findExistingSellerNewOrderNotification: vi.fn(),
}))

import * as repository from '@/features/email/email.repository'
import * as notificationsService from '@/features/notifications/notifications.service'
import {
  emitSellerNewOrderNotificationEvents,
  emitSellerNewOrderNotificationEventsForOrder,
} from './notification.events'

const mockRepository = vi.mocked(repository)
const mockNotificationsService = vi.mocked(notificationsService)

function makeOrderContext() {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    userId: 'buyer-user-id',
    status: 'confirmed',
    totalAmount: { toString: () => '199.98' },
    shippingAddressId: 'address-id',
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
        id: 'payment-1',
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
        storeId: 'store-1',
        productNameSnapshot: 'Blue Hoodie',
        variantSnapshot: 'L / Blue',
        storeNameSnapshot: 'North Store',
        unitPriceSnapshot: { toString: () => '99.99' },
        store: {
          id: 'store-1',
          name: 'North Store',
          slug: 'north-store',
          ownerId: 'seller-1',
          owner: {
            email: 'seller-1@example.com',
            name: 'Seller One',
            profile: {
              displayName: 'Seller One',
            },
          },
        },
      },
      {
        id: 'item-2',
        quantity: 2,
        storeId: 'store-2',
        productNameSnapshot: 'Red Tee',
        variantSnapshot: 'M / Red',
        storeNameSnapshot: 'South Store',
        unitPriceSnapshot: { toString: () => '49.50' },
        store: {
          id: 'store-2',
          name: 'South Store',
          slug: 'south-store',
          ownerId: 'seller-2',
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
    id: 'payment-1',
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
  mockNotificationsService.findExistingSellerNewOrderNotification.mockResolvedValue(null)
  mockNotificationsService.createSellerNotification.mockImplementation(async (input) => ({
    id: `notification-${input.userId}`,
    actionUrl: input.actionUrl ?? null,
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    message: input.message,
    metadata: input.metadata ?? null,
    readAt: null,
    title: input.title,
    type: input.type,
    updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  }))
})

describe('notification events seller order integration', () => {
  it('creates one cash on delivery seller notification per store after order confirmation', async () => {
    mockRepository.findOrderNotificationContext.mockResolvedValue(makeOrderContext() as never)

    await emitSellerNewOrderNotificationEventsForOrder({
      orderId: '11111111-1111-4111-8111-111111111111',
    })

    expect(mockNotificationsService.createSellerNotification).toHaveBeenCalledTimes(2)
    expect(mockNotificationsService.createSellerNotification).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: 'seller-1',
        type: 'SELLER_NEW_ORDER',
        actionUrl: 'https://app.example.com/seller/orders',
        metadata: expect.objectContaining({
          dedupeKey: 'seller-new-order:11111111-1111-4111-8111-111111111111:store-1',
          orderId: '11111111-1111-4111-8111-111111111111',
          paymentMethod: 'CASH_ON_DELIVERY',
          paymentStatus: 'PENDING',
          sellerItemCount: 1,
          sellerSubtotal: '99.99',
          storeId: 'store-1',
        }),
      }),
    )
    expect(mockNotificationsService.createSellerNotification).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: 'seller-2',
        metadata: expect.objectContaining({
          dedupeKey: 'seller-new-order:11111111-1111-4111-8111-111111111111:store-2',
          sellerItemCount: 2,
          sellerSubtotal: '99.00',
        }),
      }),
    )
  })

  it('creates seller notifications for paid LiqPay orders after payment success', async () => {
    mockRepository.findPaymentNotificationContext.mockResolvedValue(makePaymentContext() as never)

    await emitSellerNewOrderNotificationEvents({
      paymentId: 'payment-1',
    })

    expect(mockNotificationsService.createSellerNotification).toHaveBeenCalledTimes(2)
    expect(mockNotificationsService.createSellerNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          paymentMethod: 'CARD',
          paymentStatus: 'SUCCEEDED',
        }),
      }),
    )
  })

  it('does not duplicate seller notifications when the dedupe key already exists', async () => {
    mockRepository.findPaymentNotificationContext.mockResolvedValue(makePaymentContext() as never)
    mockNotificationsService.findExistingSellerNewOrderNotification.mockResolvedValueOnce({
      id: 'existing-1',
      actionUrl: 'https://app.example.com/seller/orders',
      createdAt: '2026-01-01T00:00:00.000Z',
      message: 'Existing notification',
      metadata: { dedupeKey: 'seller-new-order:11111111-1111-4111-8111-111111111111:store-1' },
      readAt: null,
      title: 'Нове замовлення для обробки',
      type: 'SELLER_NEW_ORDER',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } as never)

    const result = await emitSellerNewOrderNotificationEvents({
      paymentId: 'payment-1',
    })

    expect(mockNotificationsService.createSellerNotification).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(2)
  })
})
