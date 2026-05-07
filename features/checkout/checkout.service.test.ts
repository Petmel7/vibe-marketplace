import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma before any module import that touches lib/prisma
vi.mock('@/lib/prisma', () => ({ prisma: {} }))

// Mock the repository and guards
vi.mock('@/features/checkout/checkout.repository')
vi.mock('@/lib/auth/guards')

import * as repo from '@/features/checkout/checkout.repository'
import * as guards from '@/lib/auth/guards'
import { checkout } from '@/features/checkout/checkout.service'
import {
  EmptyCartError,
  CartOwnershipError,
  CheckoutInsufficientStockError,
  InactiveProductError,
  InvalidShippingAddressError,
} from '@/lib/errors/checkout'
import type { SessionUser } from '@/features/auth/auth.dto'

const mockRepo = vi.mocked(repo)
const mockGuards = vi.mocked(guards)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = 'user-0000-0000-0000-000000000001'
const CART_ID = 'cart-0000-0000-0000-000000000002'
const ADDRESS_ID = 'addr-0000-0000-0000-000000000003'
const ORDER_ID = 'ordr-0000-0000-0000-000000000004'
const VARIANT_ID = 'vari-0000-0000-0000-000000000005'
const STORE_ID = 'stor-0000-0000-0000-000000000006'

const mockUser: SessionUser = {
  id: USER_ID,
  email: 'buyer@example.com',
  roles: [],
}

const mockAddress = {
  id: ADDRESS_ID,
  userId: USER_ID,
  fullName: 'John Doe',
  phone: '+380000000000',
  country: 'UA',
  city: 'Kyiv',
  region: null,
  street: 'Main St',
  building: '1',
  apartment: null,
  zipCode: null,
  isDefault: true,
  label: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockOrder = {
  id: ORDER_ID,
  userId: USER_ID,
  status: 'pending',
  totalAmount: { toString: () => '99.98' },
  shippingAddressId: ADDRESS_ID,
  note: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    id: STORE_ID,
    ownerId: 'owner-id',
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

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-0000-0000-0000-000000000007',
    storeId: STORE_ID,
    categoryId: null,
    name: 'Test Shirt',
    description: null,
    price: { toString: () => '49.99' },
    imageUrl: '/img/shirt.jpg',
    isActive: true,
    sku: null,
    isHit: false,
    isNew: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    searchVector: null,
    store: makeStore(),
    ...overrides,
  }
}

function makeVariant(overrides: Record<string, unknown> = {}) {
  return {
    id: VARIANT_ID,
    productId: 'prod-0000-0000-0000-000000000007',
    sku: 'SKU-001',
    size: 'M' as string | null,
    color: 'Blue' as string | null,
    price: null as null | { toString(): string },
    stock: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    product: makeProduct(),
    ...overrides,
  }
}

function makeCartItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-0000-0000-0000-000000000008',
    cartId: CART_ID,
    variantId: VARIANT_ID,
    quantity: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    variant: makeVariant(),
    ...overrides,
  }
}

function makeCart(
  overrides: Record<string, unknown> = {},
  items: ReturnType<typeof makeCartItem>[] = [makeCartItem()],
) {
  return {
    id: CART_ID,
    userId: USER_ID,
    sessionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items,
    ...overrides,
  }
}

const checkoutInput = {
  cartId: CART_ID,
  shippingAddressId: ADDRESS_ID,
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks()
  // requireBuyer is a void function — mock as no-op by default
  mockGuards.requireBuyer.mockReturnValue(undefined)
  mockRepo.createOrder.mockResolvedValue(mockOrder as unknown as ReturnType<typeof mockRepo.createOrder> extends Promise<infer T> ? T : never)
  mockRepo.createOrderItems.mockResolvedValue(undefined)
  mockRepo.decrementVariantStocks.mockResolvedValue(undefined)
  mockRepo.clearCartItems.mockResolvedValue(undefined)
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('checkout — success', () => {
  it('creates order, decrements stock, clears cart and returns correct DTO', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>)
    mockRepo.findShippingAddress.mockResolvedValue(mockAddress as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>)

    const result = await checkout(mockUser, checkoutInput)

    expect(mockRepo.createOrder).toHaveBeenCalledOnce()
    expect(mockRepo.createOrderItems).toHaveBeenCalledOnce()
    expect(mockRepo.decrementVariantStocks).toHaveBeenCalledWith([
      { variantId: VARIANT_ID, qty: 2 },
    ])
    expect(mockRepo.clearCartItems).toHaveBeenCalledWith(CART_ID)

    expect(result.orderId).toBe(ORDER_ID)
    expect(result.status).toBe('pending')
    expect(result.itemCount).toBe(2)
    // totalAmount: product price 49.99 * qty 2 = 99.98
    expect(result.totalAmount).toBe('99.98')
    expect(result.createdAt).toBeInstanceOf(Date)
  })
})

describe('checkout — EmptyCartError', () => {
  it('throws EmptyCartError when cart not found', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(null)

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(EmptyCartError)
  })

  it('throws EmptyCartError when cart has no items', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({}, []) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(mockAddress as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>)

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(EmptyCartError)
  })
})

describe('checkout — CartOwnershipError', () => {
  it('throws CartOwnershipError when cart does not belong to user', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({ userId: 'other-user-id' }) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(CartOwnershipError)
  })
})

describe('checkout — CheckoutInsufficientStockError', () => {
  it('throws when item quantity exceeds variant stock', async () => {
    const itemWithLowStock = makeCartItem({
      quantity: 5,
      variant: makeVariant({ stock: 3 }),
    })
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({}, [itemWithLowStock]) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(mockAddress as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>)

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(
      CheckoutInsufficientStockError,
    )
  })
})

describe('checkout — InactiveProductError', () => {
  it('throws when product is not active', async () => {
    const itemWithInactiveProduct = makeCartItem({
      variant: makeVariant({
        product: makeProduct({ isActive: false }),
      }),
    })
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({}, [itemWithInactiveProduct]) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(mockAddress as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>)

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(InactiveProductError)
  })
})

describe('checkout — snapshot pricing', () => {
  it('uses variant price when set', async () => {
    const variantWithPrice = makeVariant({ price: { toString: () => '29.99' } })
    const item = makeCartItem({ quantity: 1, variant: variantWithPrice })
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({}, [item]) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(mockAddress as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>)

    const result = await checkout(mockUser, checkoutInput)

    expect(result.totalAmount).toBe('29.99')

    // The items passed to createOrderItems should use variant price
    const callArgs = mockRepo.createOrderItems.mock.calls[0][0]
    expect(callArgs[0].unitPriceSnapshot.toString()).toBe('29.99')
  })

  it('falls back to product base price when variant price is null', async () => {
    const variantNoPrice = makeVariant({ price: null, product: makeProduct() })
    const item = makeCartItem({ quantity: 2, variant: variantNoPrice })
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({}, [item]) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(mockAddress as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>)

    const result = await checkout(mockUser, checkoutInput)

    // product.price = 49.99, qty = 2 → 99.98
    expect(result.totalAmount).toBe('99.98')
  })
})

describe('checkout — Decimal totals', () => {
  it('returns totalAmount as string with 2 decimal places and no floating point errors', async () => {
    // Classic floating point trap: 0.1 + 0.2 = 0.30000000000000004
    const item1 = makeCartItem({
      quantity: 1,
      variant: makeVariant({ price: { toString: () => '0.10' } }),
    })
    const item2 = makeCartItem({
      id: 'item-b',
      variantId: 'vari-b',
      quantity: 1,
      variant: makeVariant({
        id: 'vari-b',
        price: { toString: () => '0.20' },
        product: makeProduct(),
      }),
    })
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({}, [item1, item2]) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(mockAddress as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>)

    const result = await checkout(mockUser, checkoutInput)

    expect(result.totalAmount).toBe('0.30')
    expect(result.totalAmount).not.toBe('0.30000000000000004')
  })
})

describe('checkout — InvalidShippingAddressError', () => {
  it('throws when shipping address is not found for user', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>)
    mockRepo.findShippingAddress.mockResolvedValue(null)

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(
      InvalidShippingAddressError,
    )
  })
})
