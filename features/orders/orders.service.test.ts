import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/orders/orders.repository')
vi.mock('@/lib/auth/guards')

import * as repo from '@/features/orders/orders.repository'
import * as guards from '@/lib/auth/guards'
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
const mockGuards = vi.mocked(guards)

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
})

// ---------------------------------------------------------------------------
// getSellerOrderItems
// ---------------------------------------------------------------------------

describe('getSellerOrderItems', () => {
  it('returns only items from the sellers store', async () => {
    const store = makeStore()
    const items = [makeSellerItem()]
    mockRepo.findStoreByOwnerId.mockResolvedValue(store as unknown as Awaited<ReturnType<typeof mockRepo.findStoreByOwnerId>>)
    mockRepo.findOrdersByStoreId.mockResolvedValue(items as unknown as Awaited<ReturnType<typeof mockRepo.findOrdersByStoreId>>)

    const result = await getSellerOrderItems(mockSeller, {})

    expect(mockRepo.findStoreByOwnerId).toHaveBeenCalledWith(USER_ID)
    expect(mockRepo.findOrdersByStoreId).toHaveBeenCalledWith(STORE_ID, {})
    expect(result).toHaveLength(1)
    expect(result[0].orderId).toBe(ORDER_ID)
    expect(result[0].productNameSnapshot).toBe('Test Product')
    expect(result[0].orderStatus).toBe('pending')
  })

  it('returns empty array when seller has no store', async () => {
    mockRepo.findStoreByOwnerId.mockResolvedValue(null)

    const result = await getSellerOrderItems(mockSeller, {})

    expect(result).toHaveLength(0)
    expect(mockRepo.findOrdersByStoreId).not.toHaveBeenCalled()
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
