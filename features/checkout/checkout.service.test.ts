import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/checkout/checkout.repository')
vi.mock('@/lib/auth/guards')

import * as repo from '@/features/checkout/checkout.repository'
import * as guards from '@/lib/auth/guards'
import { checkout, getCheckoutPreview } from '@/features/checkout/checkout.service'
import {
  CartOwnershipError,
  CheckoutAddressRequiredError,
  CheckoutPriceChangedError,
  CheckoutProductUnavailableError,
  CheckoutStockUnavailableError,
  EmptyCartError,
  InvalidShippingAddressError,
} from '@/lib/errors/checkout'
import type { SessionUser } from '@/features/auth/auth.dto'

const mockRepo = vi.mocked(repo)
const mockGuards = vi.mocked(guards)

const USER_ID = 'user-0000-0000-0000-000000000001'
const CART_ID = 'cart-0000-0000-0000-000000000002'
const ADDRESS_ID = 'addr-0000-0000-0000-000000000003'
const ORDER_ID = 'ordr-0000-0000-0000-000000000004'
const VARIANT_ID = 'vari-0000-0000-0000-000000000005'
const STORE_ID = 'stor-0000-0000-0000-000000000006'
const PRODUCT_ID = 'prod-0000-0000-0000-000000000007'

const mockUser: SessionUser = {
  id: USER_ID,
  email: 'buyer@example.com',
  roles: [],
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

function makeAddress(overrides: Record<string, unknown> = {}) {
  return {
    id: ADDRESS_ID,
    userId: USER_ID,
    label: 'Home',
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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
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
    id: PRODUCT_ID,
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
    status: 'PUBLISHED',
    createdAt: new Date(),
    updatedAt: new Date(),
    searchVector: null,
    store: makeStore(),
    images: [
      {
        id: 'image-1',
        productId: PRODUCT_ID,
        url: '/img/shirt-primary.jpg',
        storagePath: 'products/shirt-primary.jpg',
        altText: null,
        position: 0,
        isPrimary: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    ...overrides,
  }
}

function makeVariant(overrides: Record<string, unknown> = {}) {
  return {
    id: VARIANT_ID,
    productId: PRODUCT_ID,
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

beforeEach(() => {
  vi.resetAllMocks()
  mockGuards.requireBuyer.mockReturnValue(undefined)
  mockRepo.submitCheckoutOrder.mockResolvedValue(
    mockOrder as unknown as Awaited<ReturnType<typeof mockRepo.submitCheckoutOrder>>,
  )
  mockRepo.listShippingAddressesByUserId.mockResolvedValue(
    [makeAddress()] as unknown as Awaited<ReturnType<typeof mockRepo.listShippingAddressesByUserId>>,
  )
})

describe('checkout preview', () => {
  it('returns cart items, price snapshots, default shipping address, and no blocking issues for a valid cart', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )

    const preview = await getCheckoutPreview(mockUser, { cartId: CART_ID })

    expect(preview.cartId).toBe(CART_ID)
    expect(preview.itemCount).toBe(2)
    expect(preview.subtotal).toBe('99.98')
    expect(preview.shippingAmount).toBe('0.00')
    expect(preview.total).toBe('99.98')
    expect(preview.defaultShippingAddress?.id).toBe(ADDRESS_ID)
    expect(preview.addressOptions).toHaveLength(1)
    expect(preview.blockingIssues).toEqual([])
    expect(preview.canCheckout).toBe(true)
    expect(preview.items[0].imageUrl).toBe('/img/shirt-primary.jpg')
  })

  it('returns blocking issues for empty carts without throwing', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({}, []) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.listShippingAddressesByUserId.mockResolvedValue([])

    const preview = await getCheckoutPreview(mockUser, { cartId: CART_ID })

    expect(preview.items).toEqual([])
    expect(preview.canCheckout).toBe(false)
    expect(preview.blockingIssues.map((issue) => issue.code)).toEqual([
      'EMPTY_CART',
      'ADDRESS_REQUIRED',
    ])
  })

  it('uses the buyer cart when no cartId is provided', async () => {
    mockRepo.getCartWithItemsByUserId.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItemsByUserId>>,
    )

    const preview = await getCheckoutPreview(mockUser, {})

    expect(mockRepo.getCartWithItemsByUserId).toHaveBeenCalledWith(USER_ID)
    expect(preview.cartId).toBe(CART_ID)
  })
})

describe('checkout submit', () => {
  it('creates an order atomically and returns the checkout response DTO', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )

    const result = await checkout(mockUser, checkoutInput)

    expect(mockRepo.submitCheckoutOrder).toHaveBeenCalledOnce()
    const payload = mockRepo.submitCheckoutOrder.mock.calls[0][0]
    expect(payload.cartId).toBe(CART_ID)
    expect(payload.shippingAddressId).toBe(ADDRESS_ID)
    expect(payload.stockUpdates).toEqual([{ variantId: VARIANT_ID, qty: 2 }])
    expect(payload.items[0]).toMatchObject({
      variantId: VARIANT_ID,
      storeId: STORE_ID,
      quantity: 2,
      productNameSnapshot: 'Test Shirt',
      variantSnapshot: 'M / Blue',
      imageSnapshot: '/img/shirt-primary.jpg',
      storeNameSnapshot: 'Test Store',
    })

    expect(result).toMatchObject({
      orderId: ORDER_ID,
      totalAmount: '99.98',
      itemCount: 2,
      status: 'pending',
    })
  })

  it('blocks empty carts', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(null)

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(EmptyCartError)
  })

  it('blocks carts owned by another user', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({ userId: 'other-user-id' }) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(CartOwnershipError)
  })

  it('requires a shipping address at submit time', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )

    await expect(
      checkout(mockUser, { cartId: CART_ID, shippingAddressId: null }),
    ).rejects.toThrow(CheckoutAddressRequiredError)
  })

  it('validates shipping address ownership', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(null)

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(
      InvalidShippingAddressError,
    )
  })

  it('blocks unpublished products', async () => {
    const item = makeCartItem({
      variant: makeVariant({
        product: makeProduct({ status: 'PENDING_REVIEW' }),
      }),
    })
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({}, [item]) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(
      CheckoutProductUnavailableError,
    )
  })

  it('blocks inactive stores', async () => {
    const item = makeCartItem({
      variant: makeVariant({
        product: makeProduct({
          store: makeStore({ isActive: false }),
        }),
      }),
    })
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({}, [item]) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(
      CheckoutProductUnavailableError,
    )
  })

  it('blocks insufficient stock', async () => {
    const item = makeCartItem({
      quantity: 5,
      variant: makeVariant({ stock: 3 }),
    })
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({}, [item]) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(
      CheckoutStockUnavailableError,
    )
  })

  it('blocks stale totals when prices changed since preview', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )

    await expect(
      checkout(mockUser, {
        ...checkoutInput,
        expectedSubtotal: '50.00',
        expectedTotal: '50.00',
      }),
    ).rejects.toThrow(CheckoutPriceChangedError)
  })

  it('uses variant price snapshots when the variant overrides the base price', async () => {
    const item = makeCartItem({
      quantity: 1,
      variant: makeVariant({ price: { toString: () => '29.99' } }),
    })
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({}, [item]) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )

    const result = await checkout(mockUser, checkoutInput)

    const payload = mockRepo.submitCheckoutOrder.mock.calls[0][0]
    expect(payload.items[0].unitPriceSnapshot.toString()).toBe('29.99')
    expect(result.totalAmount).toBe('29.99')
  })
})
