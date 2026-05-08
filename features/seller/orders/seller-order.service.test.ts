import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ItemFulfillmentStatus } from '@/app/generated/prisma/client'

vi.mock('@/features/seller/orders/seller-order.repository')
vi.mock('@/features/store/store.repository')
vi.mock('@/lib/auth/guards')
vi.mock('@/lib/prisma', () => ({
  prisma: { shippingAddress: { findUnique: vi.fn().mockResolvedValue(null) } },
}))

import * as orderRepo from '@/features/seller/orders/seller-order.repository'
import * as storeRepo from '@/features/store/store.repository'
import * as guards from '@/lib/auth/guards'
import {
  getMyOrderItems,
  markAsProcessing,
  markAsShipped,
  markAsDelivered,
} from '@/features/seller/orders/seller-order.service'
import { InvalidFulfillmentTransitionError } from '@/lib/errors/seller'
import type { SessionUser } from '@/features/auth/auth.dto'

const mockOrderRepo = vi.mocked(orderRepo)
const mockStoreRepo = vi.mocked(storeRepo)
const mockGuards = vi.mocked(guards)

const mockUser: SessionUser = {
  id: 'user-uuid-001',
  email: 'seller@example.com',
  roles: ['SELLER' as never],
}

const mockStore = {
  id: 'store-uuid-001',
  ownerId: 'user-uuid-001',
  name: 'Test Store',
  slug: 'test-store',
  description: null,
  logoUrl: null,
  bannerUrl: null,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeOrderItem(overrides: Record<string, any> = {}): any {
  return {
    id: 'item-uuid-001',
    orderId: 'order-uuid-001',
    storeId: 'store-uuid-001',
    variantId: 'variant-uuid-001',
    quantity: 2,
    unitPrice: { toString: () => '29.99' },
    productNameSnapshot: 'Test Product',
    variantSnapshot: null,
    imageSnapshot: null,
    storeNameSnapshot: 'Test Store',
    unitPriceSnapshot: { toString: () => '29.99' },
    fulfillmentStatus: ItemFulfillmentStatus.PENDING,
    createdAt: new Date('2024-01-01'),
    order: {
      id: 'order-uuid-001',
      userId: 'user-uuid-002',
      status: 'confirmed',
      totalAmount: { toString: () => '59.98' },
      note: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      shippingAddressId: null,
    },
    variant: {
      id: 'variant-uuid-001',
      productId: 'product-uuid-001',
      sku: 'SKU-001',
      size: null,
      color: null,
      price: null,
      stock: 10,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGuards.requireSeller.mockReturnValue(undefined)
  mockStoreRepo.findStoreByUserId.mockResolvedValue(mockStore)
})

// ---------------------------------------------------------------------------
// Test 1: markAsProcessing — confirmed order + PENDING item → PROCESSING
// ---------------------------------------------------------------------------
describe('markAsProcessing', () => {
  it('transitions PENDING item to PROCESSING when order is confirmed', async () => {
    const item = makeOrderItem({
      fulfillmentStatus: ItemFulfillmentStatus.PENDING,
      order: {
        id: 'order-uuid-001',
        userId: 'user-uuid-002',
        status: 'confirmed',
        totalAmount: { toString: () => '59.98' },
        note: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        shippingAddressId: null,
      },
    })
    const updatedItem = makeOrderItem({
      fulfillmentStatus: ItemFulfillmentStatus.PROCESSING,
      order: {
        id: 'order-uuid-001',
        userId: 'user-uuid-002',
        status: 'confirmed',
        totalAmount: { toString: () => '59.98' },
        note: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        shippingAddressId: null,
      },
    })
    mockOrderRepo.findOrderItemById.mockResolvedValue(item)
    mockOrderRepo.updateItemFulfillmentStatus.mockResolvedValue(updatedItem)

    const result = await markAsProcessing(mockUser, 'item-uuid-001')

    expect(mockOrderRepo.updateItemFulfillmentStatus).toHaveBeenCalledWith(
      'item-uuid-001',
      ItemFulfillmentStatus.PROCESSING,
    )
    expect(result.fulfillmentStatus).toBe(ItemFulfillmentStatus.PROCESSING)
  })

  it('throws InvalidFulfillmentTransitionError when order status is not confirmed', async () => {
    const item = makeOrderItem({
      fulfillmentStatus: ItemFulfillmentStatus.PENDING,
      order: {
        id: 'order-uuid-001',
        userId: 'user-uuid-002',
        status: 'pending',
        totalAmount: { toString: () => '59.98' },
        note: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        shippingAddressId: null,
      },
    })
    mockOrderRepo.findOrderItemById.mockResolvedValue(item)

    await expect(markAsProcessing(mockUser, 'item-uuid-001')).rejects.toThrow(
      InvalidFulfillmentTransitionError,
    )
    expect(mockOrderRepo.updateItemFulfillmentStatus).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Test 3: markAsShipped — PROCESSING → SHIPPED
// ---------------------------------------------------------------------------
describe('markAsShipped', () => {
  it('transitions PROCESSING item to SHIPPED', async () => {
    const item = makeOrderItem({
      fulfillmentStatus: ItemFulfillmentStatus.PROCESSING,
      order: {
        id: 'order-uuid-001',
        userId: 'user-uuid-002',
        status: 'processing',
        totalAmount: { toString: () => '59.98' },
        note: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        shippingAddressId: null,
      },
    })
    const updatedItem = makeOrderItem({
      fulfillmentStatus: ItemFulfillmentStatus.SHIPPED,
      order: {
        id: 'order-uuid-001',
        userId: 'user-uuid-002',
        status: 'processing',
        totalAmount: { toString: () => '59.98' },
        note: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        shippingAddressId: null,
      },
    })
    mockOrderRepo.findOrderItemById.mockResolvedValue(item)
    mockOrderRepo.updateItemFulfillmentStatus.mockResolvedValue(updatedItem)

    const result = await markAsShipped(mockUser, 'item-uuid-001')

    expect(mockOrderRepo.updateItemFulfillmentStatus).toHaveBeenCalledWith(
      'item-uuid-001',
      ItemFulfillmentStatus.SHIPPED,
    )
    expect(result.fulfillmentStatus).toBe(ItemFulfillmentStatus.SHIPPED)
  })
})

// ---------------------------------------------------------------------------
// Test 4: markAsDelivered — SHIPPED → DELIVERED
// ---------------------------------------------------------------------------
describe('markAsDelivered', () => {
  it('transitions SHIPPED item to DELIVERED', async () => {
    const item = makeOrderItem({
      fulfillmentStatus: ItemFulfillmentStatus.SHIPPED,
      order: {
        id: 'order-uuid-001',
        userId: 'user-uuid-002',
        status: 'shipped',
        totalAmount: { toString: () => '59.98' },
        note: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        shippingAddressId: null,
      },
    })
    const updatedItem = makeOrderItem({
      fulfillmentStatus: ItemFulfillmentStatus.DELIVERED,
      order: {
        id: 'order-uuid-001',
        userId: 'user-uuid-002',
        status: 'shipped',
        totalAmount: { toString: () => '59.98' },
        note: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        shippingAddressId: null,
      },
    })
    mockOrderRepo.findOrderItemById.mockResolvedValue(item)
    mockOrderRepo.updateItemFulfillmentStatus.mockResolvedValue(updatedItem)

    const result = await markAsDelivered(mockUser, 'item-uuid-001')

    expect(mockOrderRepo.updateItemFulfillmentStatus).toHaveBeenCalledWith(
      'item-uuid-001',
      ItemFulfillmentStatus.DELIVERED,
    )
    expect(result.fulfillmentStatus).toBe(ItemFulfillmentStatus.DELIVERED)
  })
})

// ---------------------------------------------------------------------------
// Test 5: getMyOrderItems — returns only items from seller's store
// ---------------------------------------------------------------------------
describe('getMyOrderItems', () => {
  it('returns only items belonging to the seller store', async () => {
    const items = [
      makeOrderItem({ id: 'item-1', storeId: 'store-uuid-001' }),
      makeOrderItem({ id: 'item-2', storeId: 'store-uuid-001' }),
    ]
    mockOrderRepo.findOrderItemsByStoreId.mockResolvedValue(items)

    const result = await getMyOrderItems(mockUser, {})

    expect(mockOrderRepo.findOrderItemsByStoreId).toHaveBeenCalledWith(
      mockStore.id,
      expect.any(Object),
    )
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('item-1')
    expect(result[1].id).toBe('item-2')
  })
})
