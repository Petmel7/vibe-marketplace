import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/orders/orders.repository')
vi.mock('@/features/store/store.service')
vi.mock('@/lib/auth/guards')
vi.mock('@/features/email/events/email.events', () => ({
  emitOrderConfirmedEmailEvent: vi.fn(),
}))

import * as repo from '@/features/orders/orders.repository'
import * as storeService from '@/features/store/store.service'
import * as guards from '@/lib/auth/guards'
import { emitOrderConfirmedEmailEvent } from '@/features/email/events/email.events'
import {
  getMyOrders,
  getMyOrderById,
  getSellerOrderItems,
  getAllOrders,
  updateStatus,
} from '@/features/orders/orders.service'
import { OrderNotFoundError, OrderAccessError, InvalidStatusTransitionError } from '@/lib/errors/orders'
import type { SessionUser } from '@/features/auth/auth.dto'

const mockRepo = vi.mocked(repo)
const mockStoreService = vi.mocked(storeService)
const mockGuards = vi.mocked(guards)
const mockEmitOrderConfirmedEmailEvent = vi.mocked(emitOrderConfirmedEmailEvent)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = 'user-0001'
const OTHER_USER_ID = 'user-0002'
const STORE_ID = 'store-0001'
const ORDER_ID = 'order-0001'

const mockBuyer: SessionUser = { id: USER_ID, email: 'buyer@test.com', roles: [] }
const mockSeller: SessionUser = { id: USER_ID, email: 'seller@test.com', roles: [] }
const mockAdmin: SessionUser = { id: USER_ID, email: 'admin@test.com', roles: [] }

function makeOrderItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'oi-001',
    orderId: ORDER_ID,
    variantId: 'v-001',
    storeId: STORE_ID,
    quantity: 2,
    unitPrice: { toString: () => '50.00' },
    productNameSnapshot: 'Test Product',
    variantSnapshot: 'M / Red',
    imageSnapshot: null,
    storeNameSnapshot: 'Test Store',
    unitPriceSnapshot: { toString: () => '50.00' },
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-001',
    provider: 'MANUAL',
    method: 'CASH_ON_DELIVERY',
    status: 'PENDING',
    paidAt: null,
    createdAt: new Date('2026-01-01T01:00:00.000Z'),
    ...overrides,
  }
}

function makeOrderPromotion(overrides: Record<string, unknown> = {}) {
  return {
    promotionId: 'promo-001',
    promotionCode: 'SAVE10',
    ownerType: 'MARKETPLACE',
    storeId: null,
    promotionName: 'Save 10',
    discountType: 'PERCENTAGE',
    discountValue: { toString: () => '10.00' },
    discountAmount: { toString: () => '10.00' },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    userId: USER_ID,
    status: 'pending',
    totalAmount: { toString: () => '100.00' },
    shippingAddressId: null,
    note: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    items: [makeOrderItem()],
    shipments: [],
    payments: [makePayment()],
    orderPromotion: null,
    ...overrides,
  }
}

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    id: STORE_ID,
    ownerId: USER_ID,
    name: 'Test Store',
    slug: 'test-store',
    description: null,
    logoUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeSellerItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'oi-001',
    orderId: ORDER_ID,
    variantId: 'v-001',
    storeId: STORE_ID,
    quantity: 1,
    unitPrice: { toString: () => '49.99' },
    productNameSnapshot: 'Test Product',
    variantSnapshot: 'L / Blue',
    imageSnapshot: null,
    storeNameSnapshot: 'Test Store',
    unitPriceSnapshot: { toString: () => '49.99' },
    createdAt: new Date('2026-01-01'),
    order: {
      id: ORDER_ID,
      userId: OTHER_USER_ID,
      status: 'pending',
      totalAmount: { toString: () => '49.99' },
      shippingAddressId: null,
      note: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks()
  mockGuards.requireBuyer.mockReturnValue(undefined)
  mockGuards.requireSeller.mockReturnValue(undefined)
  mockGuards.requireAdmin.mockReturnValue(undefined)
  mockStoreService.resolveSellerStoreContext.mockResolvedValue(makeStore() as never)
  mockEmitOrderConfirmedEmailEvent.mockResolvedValue(null)
})

// ---------------------------------------------------------------------------
// getMyOrders
// ---------------------------------------------------------------------------

describe('getMyOrders', () => {
  it('returns only orders for the authenticated user', async () => {
    const orders = [makeOrder()]
    mockRepo.findOrdersByUserId.mockResolvedValue(orders as unknown as Awaited<ReturnType<typeof mockRepo.findOrdersByUserId>>)

    const result = await getMyOrders(mockBuyer, {})

    expect(mockRepo.findOrdersByUserId).toHaveBeenCalledWith(USER_ID, {})
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(ORDER_ID)
    expect(result[0].status).toBe('pending')
    expect(result[0].itemCount).toBe(2)
    expect(result[0].storeNames).toContain('Test Store')
    expect(result[0].paymentMethod).toBe('CASH_ON_DELIVERY')
    expect(result[0].paymentStatus).toBe('PENDING')
    expect(result[0].paymentProvider).toBe('MANUAL')
    expect(result[0].paymentId).toBe('pay-001')
  })

  it('returns empty array when user has no orders', async () => {
    mockRepo.findOrdersByUserId.mockResolvedValue([])

    const result = await getMyOrders(mockBuyer, {})

    expect(result).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// getMyOrderById
// ---------------------------------------------------------------------------

describe('getMyOrderById', () => {
  it('returns the order when it belongs to the user', async () => {
    const order = makeOrder()
    mockRepo.findOrderById.mockResolvedValue(order as unknown as Awaited<ReturnType<typeof mockRepo.findOrderById>>)

    const result = await getMyOrderById(mockBuyer, ORDER_ID)

    expect(result.id).toBe(ORDER_ID)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].productNameSnapshot).toBe('Test Product')
    expect(result.paymentId).toBe('pay-001')
    expect(result.paymentMethod).toBe('CASH_ON_DELIVERY')
    expect(result.paymentStatus).toBe('PENDING')
    expect(result.paidAt).toBeNull()
    expect(result.promotion).toBeNull()
    expect(result.shipments).toEqual([])
  })

  it('exposes buyer-safe shipment snapshot data from order history', async () => {
    const order = makeOrder({
      shipments: [
        {
          id: 'shipment-1',
          provider: 'NOVA_POSHTA',
          deliveryType: 'NOVA_POSHTA_WAREHOUSE',
          status: 'LABEL_CREATED',
          recipientCityRef: 'city-ref',
          recipientCityName: 'Kyiv',
          recipientStreet: null,
          recipientBuilding: null,
          recipientApartment: null,
          recipientWarehouseRef: 'warehouse-ref',
          recipientWarehouseName: 'Warehouse 1',
          trackingNumber: '20450000000001',
          isReturnShipment: false,
          originalShipmentId: null,
        },
      ],
    })
    mockRepo.findOrderById.mockResolvedValue(order as unknown as Awaited<ReturnType<typeof mockRepo.findOrderById>>)

    const result = await getMyOrderById(mockBuyer, ORDER_ID)

    expect(result.shipments).toEqual([
      {
        id: 'shipment-1',
        provider: 'NOVA_POSHTA',
        deliveryType: 'NOVA_POSHTA_WAREHOUSE',
        status: 'LABEL_CREATED',
        recipientCityRef: 'city-ref',
        recipientCityName: 'Kyiv',
        recipientStreet: null,
        recipientBuilding: null,
        recipientApartment: null,
        recipientWarehouseRef: 'warehouse-ref',
        recipientWarehouseName: 'Warehouse 1',
        trackingNumber: '20450000000001',
        isReturnShipment: false,
        originalShipmentId: null,
      },
    ])
  })

  it('returns marketplace promotion snapshot fields from order history', async () => {
    const order = makeOrder({
      orderPromotion: makeOrderPromotion(),
    })
    mockRepo.findOrderById.mockResolvedValue(order as unknown as Awaited<ReturnType<typeof mockRepo.findOrderById>>)

    const result = await getMyOrderById(mockBuyer, ORDER_ID)

    expect(result.promotion).toEqual({
      promotionId: 'promo-001',
      promotionCode: 'SAVE10',
      ownerType: 'MARKETPLACE',
      storeId: null,
      promotionName: 'Save 10',
      discountType: 'PERCENTAGE',
      discountValue: '10.00',
      discountAmount: '10.00',
    })
  })

  it('returns seller promotion snapshot fields from order history', async () => {
    const order = makeOrder({
      orderPromotion: makeOrderPromotion({
        promotionCode: 'STORE20',
        ownerType: 'SELLER',
        storeId: STORE_ID,
        promotionName: 'Store 20%',
        discountType: 'FIXED_AMOUNT',
        discountValue: { toString: () => '20.00' },
        discountAmount: { toString: () => '20.00' },
      }),
    })
    mockRepo.findOrderById.mockResolvedValue(order as unknown as Awaited<ReturnType<typeof mockRepo.findOrderById>>)

    const result = await getMyOrderById(mockBuyer, ORDER_ID)

    expect(result.promotion).toEqual({
      promotionId: 'promo-001',
      promotionCode: 'STORE20',
      ownerType: 'SELLER',
      storeId: STORE_ID,
      promotionName: 'Store 20%',
      discountType: 'FIXED_AMOUNT',
      discountValue: '20.00',
      discountAmount: '20.00',
    })
  })

  it('prefers immutable order promotion snapshot fields over any changed live promotion context', async () => {
    const order = makeOrder({
      orderPromotion: {
        ...makeOrderPromotion({
          ownerType: 'SELLER',
          storeId: STORE_ID,
          promotionName: 'Historical Seller Promo',
          discountType: 'FIXED_AMOUNT',
          discountValue: { toString: () => '15.00' },
          discountAmount: { toString: () => '15.00' },
        }),
        promotion: {
          ownerType: 'MARKETPLACE',
          storeId: null,
          name: 'Changed Live Promotion',
          discountType: 'PERCENTAGE',
          discountValue: { toString: () => '99.00' },
        },
      },
    })
    mockRepo.findOrderById.mockResolvedValue(order as unknown as Awaited<ReturnType<typeof mockRepo.findOrderById>>)

    const result = await getMyOrderById(mockBuyer, ORDER_ID)

    expect(result.promotion).toMatchObject({
      ownerType: 'SELLER',
      storeId: STORE_ID,
      promotionName: 'Historical Seller Promo',
      discountType: 'FIXED_AMOUNT',
      discountValue: '15.00',
      discountAmount: '15.00',
    })
  })

  it('exposes the latest card payment status for webhook-driven orders', async () => {
    const order = makeOrder({
      payments: [
        makePayment({
          id: 'pay-card-new',
          provider: 'LIQPAY',
          method: 'CARD',
          status: 'PROCESSING',
          paidAt: null,
          createdAt: new Date('2026-01-02T12:00:00.000Z'),
        }),
        makePayment({
          id: 'pay-card-old',
          provider: 'LIQPAY',
          method: 'CARD',
          status: 'FAILED',
          paidAt: null,
          createdAt: new Date('2026-01-01T12:00:00.000Z'),
        }),
      ],
    })
    mockRepo.findOrderById.mockResolvedValue(order as unknown as Awaited<ReturnType<typeof mockRepo.findOrderById>>)

    const result = await getMyOrderById(mockBuyer, ORDER_ID)

    expect(result.paymentId).toBe('pay-card-new')
    expect(result.paymentProvider).toBe('LIQPAY')
    expect(result.paymentMethod).toBe('CARD')
    expect(result.paymentStatus).toBe('PROCESSING')
  })

  it('exposes refunded payment state safely', async () => {
    const order = makeOrder({
      payments: [
        makePayment({
          id: 'pay-refunded',
          provider: 'LIQPAY',
          method: 'CARD',
          status: 'REFUNDED',
          paidAt: new Date('2026-01-03T12:00:00.000Z'),
        }),
      ],
    })
    mockRepo.findOrderById.mockResolvedValue(order as unknown as Awaited<ReturnType<typeof mockRepo.findOrderById>>)

    const result = await getMyOrderById(mockBuyer, ORDER_ID)

    expect(result.paymentStatus).toBe('REFUNDED')
    expect(result.paidAt).toBe('2026-01-03T12:00:00.000Z')
  })

  it('throws OrderNotFoundError when order does not exist', async () => {
    mockRepo.findOrderById.mockResolvedValue(null)

    await expect(getMyOrderById(mockBuyer, ORDER_ID)).rejects.toThrow(OrderNotFoundError)
  })

  it('throws OrderAccessError when order belongs to a different user', async () => {
    const order = makeOrder({ userId: OTHER_USER_ID })
    mockRepo.findOrderById.mockResolvedValue(order as unknown as Awaited<ReturnType<typeof mockRepo.findOrderById>>)

    await expect(getMyOrderById(mockBuyer, ORDER_ID)).rejects.toThrow(OrderAccessError)
  })

  it('does not expose payment data to non-owners', async () => {
    const order = makeOrder({
      userId: OTHER_USER_ID,
      payments: [makePayment({ id: 'pay-secret', provider: 'LIQPAY', method: 'CARD', status: 'SUCCEEDED' })],
    })
    mockRepo.findOrderById.mockResolvedValue(order as unknown as Awaited<ReturnType<typeof mockRepo.findOrderById>>)

    await expect(getMyOrderById(mockBuyer, ORDER_ID)).rejects.toThrow(OrderAccessError)
  })
})

// ---------------------------------------------------------------------------
// getSellerOrderItems
// ---------------------------------------------------------------------------

describe('getSellerOrderItems', () => {
  it('returns only items from the sellers store', async () => {
    const store = makeStore()
    const items = [makeSellerItem()]
    mockStoreService.resolveSellerStoreContext.mockResolvedValueOnce(store as never)
    mockRepo.findOrdersByStoreId.mockResolvedValue(items as unknown as Awaited<ReturnType<typeof mockRepo.findOrdersByStoreId>>)

    const result = await getSellerOrderItems(mockSeller, {})

    expect(mockStoreService.resolveSellerStoreContext).toHaveBeenCalledWith(mockSeller, undefined)
    expect(mockRepo.findOrdersByStoreId).toHaveBeenCalledWith(STORE_ID, {})
    expect(result).toHaveLength(1)
    expect(result[0].orderId).toBe(ORDER_ID)
    expect(result[0].productNameSnapshot).toBe('Test Product')
    expect(result[0].orderStatus).toBe('pending')
  })

  it('can scope seller order items to a specific owned store', async () => {
    const store = makeStore({ id: 'store-0002' })
    mockStoreService.resolveSellerStoreContext.mockResolvedValueOnce(store as never)
    mockRepo.findOrdersByStoreId.mockResolvedValue([makeSellerItem({ storeId: 'store-0002' })] as never)

    await getSellerOrderItems(mockSeller, { storeId: 'store-0002' })

    expect(mockStoreService.resolveSellerStoreContext).toHaveBeenCalledWith(
      mockSeller,
      'store-0002',
    )
    expect(mockRepo.findOrdersByStoreId).toHaveBeenCalledWith('store-0002', {
      storeId: 'store-0002',
    })
  })
})

// ---------------------------------------------------------------------------
// getAllOrders
// ---------------------------------------------------------------------------

describe('getAllOrders', () => {
  it('returns all orders for admin', async () => {
    const orders = [
      makeOrder({ id: 'order-1', userId: USER_ID }),
      makeOrder({ id: 'order-2', userId: OTHER_USER_ID }),
    ]
    mockRepo.findAllOrders.mockResolvedValue(orders as unknown as Awaited<ReturnType<typeof mockRepo.findAllOrders>>)

    const result = await getAllOrders(mockAdmin, {})

    expect(mockRepo.findAllOrders).toHaveBeenCalledWith({})
    expect(result).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// updateStatus
// ---------------------------------------------------------------------------

describe('updateStatus', () => {
  it('updates order status when transition is valid', async () => {
    const order = makeOrder({ status: 'pending' })
    const updated = makeOrder({ status: 'confirmed' })
    mockRepo.findOrderById.mockResolvedValue(order as unknown as Awaited<ReturnType<typeof mockRepo.findOrderById>>)
    mockRepo.updateOrderStatus.mockResolvedValue(updated as unknown as Awaited<ReturnType<typeof mockRepo.updateOrderStatus>>)

    const result = await updateStatus(mockAdmin, ORDER_ID, 'confirmed')

    expect(mockRepo.updateOrderStatus).toHaveBeenCalledWith(ORDER_ID, 'confirmed')
    expect(result.status).toBe('confirmed')
    expect(mockEmitOrderConfirmedEmailEvent).toHaveBeenCalledWith({ orderId: ORDER_ID })
  })

  it('does not fail order confirmation when email enqueue fails', async () => {
    const order = makeOrder({ status: 'pending' })
    const updated = makeOrder({ status: 'confirmed' })
    mockRepo.findOrderById.mockResolvedValue(order as unknown as Awaited<ReturnType<typeof mockRepo.findOrderById>>)
    mockRepo.updateOrderStatus.mockResolvedValue(updated as unknown as Awaited<ReturnType<typeof mockRepo.updateOrderStatus>>)
    mockEmitOrderConfirmedEmailEvent.mockRejectedValueOnce(new Error('email down'))

    const result = await updateStatus(mockAdmin, ORDER_ID, 'confirmed')

    expect(result.status).toBe('confirmed')
  })

  it('throws OrderNotFoundError when order does not exist', async () => {
    mockRepo.findOrderById.mockResolvedValue(null)

    await expect(updateStatus(mockAdmin, ORDER_ID, 'confirmed')).rejects.toThrow(
      OrderNotFoundError,
    )
  })

  it('throws InvalidStatusTransitionError on delivered -> pending', async () => {
    const deliveredOrder = makeOrder({ status: 'delivered' })
    mockRepo.findOrderById.mockResolvedValue(deliveredOrder as unknown as Awaited<ReturnType<typeof mockRepo.findOrderById>>)

    await expect(updateStatus(mockAdmin, ORDER_ID, 'pending')).rejects.toThrow(
      InvalidStatusTransitionError,
    )
  })

  it('throws InvalidStatusTransitionError on cancelled -> paid', async () => {
    const cancelledOrder = makeOrder({ status: 'cancelled' })
    mockRepo.findOrderById.mockResolvedValue(cancelledOrder as unknown as Awaited<ReturnType<typeof mockRepo.findOrderById>>)

    await expect(updateStatus(mockAdmin, ORDER_ID, 'paid')).rejects.toThrow(
      InvalidStatusTransitionError,
    )
  })

  it('throws InvalidStatusTransitionError on shipped -> pending (skipping states)', async () => {
    const shippedOrder = makeOrder({ status: 'shipped' })
    mockRepo.findOrderById.mockResolvedValue(shippedOrder as unknown as Awaited<ReturnType<typeof mockRepo.findOrderById>>)

    await expect(updateStatus(mockAdmin, ORDER_ID, 'pending')).rejects.toThrow(
      InvalidStatusTransitionError,
    )
  })
})
