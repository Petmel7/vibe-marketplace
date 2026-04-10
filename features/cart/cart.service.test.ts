import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CartWithItems, CartItemWithVariant } from '@/features/cart/cart.repository'

// Mock prisma before any repository import triggers lib/prisma.ts initialization
vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import * as repo from '@/features/cart/cart.repository'
import {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  CartItemNotFoundError,
  InsufficientStockError,
  VariantNotFoundError,
} from '@/features/cart/cart.service'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/features/cart/cart.repository')

const mockRepo = vi.mocked(repo)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CART_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const ITEM_ID  = 'bbbbbbbb-0000-0000-0000-000000000002'
const VARIANT_ID = 'cccccccc-0000-0000-0000-000000000003'
const SESSION_ID = 'guest-session-xyz'

const identifier = { sessionId: SESSION_ID }

function makeVariant(overrides: Record<string, unknown> = {}) {
  return {
    id: VARIANT_ID,
    productId: 'prod-001',
    sku: 'SKU-001',
    size: 'M' as string | null,
    color: 'Blue' as string | null,
    price: null,
    stock: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    product: {
      id: 'prod-001',
      name: 'Test Shirt',
      price: { toString: () => '49.99' },
      imageUrl: null,
    },
    ...overrides,
  }
}

function makeCartItem(overrides: Record<string, unknown> = {}): CartItemWithVariant {
  return {
    id: ITEM_ID,
    cartId: CART_ID,
    variantId: VARIANT_ID,
    quantity: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    variant: makeVariant() as unknown as CartItemWithVariant['variant'],
    ...overrides,
  } as unknown as CartItemWithVariant
}

function makeCart(items: CartItemWithVariant[] = []): CartWithItems {
  return {
    id: CART_ID,
    userId: null,
    sessionId: SESSION_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    items,
  } as unknown as CartWithItems
}

// ---------------------------------------------------------------------------
// getCart
// ---------------------------------------------------------------------------

describe('getCart', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns an empty cart when no items exist', async () => {
    mockRepo.findOrCreateCart.mockResolvedValue(makeCart([]))

    const result = await getCart(identifier)

    expect(result.id).toBe(CART_ID)
    expect(result.items).toHaveLength(0)
    expect(result.totalAmount).toBe('0.00')
    expect(result.itemCount).toBe(0)
  })

  it('computes totals using variant price when set', async () => {
    // variant price = 39.99, qty = 2 → lineTotal = 79.98
    const item = makeCartItem({
      quantity: 2,
      variant: makeVariant({ price: { toString: () => '39.99' } }),
    })
    mockRepo.findOrCreateCart.mockResolvedValue(makeCart([item]))

    const result = await getCart(identifier)

    expect(result.items[0].unitPrice).toBe('39.99')
    expect(result.items[0].lineTotal).toBe('79.98')
    expect(result.totalAmount).toBe('79.98')
    expect(result.itemCount).toBe(2)
  })

  it('falls back to product base price when variant price is null', async () => {
    // product price = 49.99, qty = 3 → lineTotal = 149.97
    const item = makeCartItem({
      quantity: 3,
      variant: makeVariant({ price: null }),
    })
    mockRepo.findOrCreateCart.mockResolvedValue(makeCart([item]))

    const result = await getCart(identifier)

    expect(result.items[0].unitPrice).toBe('49.99')
    expect(result.items[0].lineTotal).toBe('149.97')
    expect(result.totalAmount).toBe('149.97')
    expect(result.itemCount).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// addItem
// ---------------------------------------------------------------------------

describe('addItem', () => {
  beforeEach(() => vi.resetAllMocks())

  it('adds a new item and returns the updated cart', async () => {
    const item = makeCartItem({ quantity: 1 })
    mockRepo.findOrCreateCart.mockResolvedValue(makeCart([item]))
    mockRepo.findVariantById.mockResolvedValue(makeVariant({ stock: 5 }))
    mockRepo.upsertCartItem.mockResolvedValue(undefined)

    const result = await addItem(identifier, { variantId: VARIANT_ID, quantity: 1 })

    expect(mockRepo.upsertCartItem).toHaveBeenCalledWith(CART_ID, VARIANT_ID, 1)
    expect(result.items).toHaveLength(1)
  })

  it('throws VariantNotFoundError when variant does not exist', async () => {
    mockRepo.findVariantById.mockResolvedValue(null)

    await expect(addItem(identifier, { variantId: VARIANT_ID, quantity: 1 }))
      .rejects.toThrow(VariantNotFoundError)
  })

  it('throws InsufficientStockError when requested qty exceeds stock', async () => {
    mockRepo.findVariantById.mockResolvedValue(makeVariant({ stock: 2 }))
    // existing cart has 0 items so current qty for this variant = 0
    mockRepo.findOrCreateCart.mockResolvedValue(makeCart([]))

    await expect(addItem(identifier, { variantId: VARIANT_ID, quantity: 3 }))
      .rejects.toThrow(InsufficientStockError)
  })

  it('throws InsufficientStockError when adding would exceed stock vs existing qty', async () => {
    // already 2 in cart, stock = 3, trying to add 2 more → total 4 > 3
    const item = makeCartItem({ quantity: 2 })
    mockRepo.findVariantById.mockResolvedValue(makeVariant({ stock: 3 }))
    mockRepo.findOrCreateCart.mockResolvedValue(makeCart([item]))

    await expect(addItem(identifier, { variantId: VARIANT_ID, quantity: 2 }))
      .rejects.toThrow(InsufficientStockError)
  })
})

// ---------------------------------------------------------------------------
// updateItem
// ---------------------------------------------------------------------------

describe('updateItem', () => {
  beforeEach(() => vi.resetAllMocks())

  it('updates quantity and returns the updated cart', async () => {
    const item = makeCartItem({ quantity: 5 })
    mockRepo.findCartItem.mockResolvedValue(makeCartItem({ quantity: 1 }))
    mockRepo.findVariantById.mockResolvedValue(makeVariant({ stock: 10 }))
    mockRepo.updateCartItemQuantity.mockResolvedValue(undefined)
    mockRepo.findOrCreateCart.mockResolvedValue(makeCart([item]))

    const result = await updateItem(identifier, ITEM_ID, { quantity: 5 })

    expect(mockRepo.updateCartItemQuantity).toHaveBeenCalledWith(ITEM_ID, 5)
    expect(result.items[0].quantity).toBe(5)
  })

  it('throws CartItemNotFoundError when item does not belong to cart', async () => {
    mockRepo.findOrCreateCart.mockResolvedValue(makeCart([]))
    mockRepo.findCartItem.mockResolvedValue(null)

    await expect(updateItem(identifier, ITEM_ID, { quantity: 2 }))
      .rejects.toThrow(CartItemNotFoundError)
  })

  it('throws InsufficientStockError when new qty exceeds stock', async () => {
    mockRepo.findOrCreateCart.mockResolvedValue(makeCart([makeCartItem()]))
    mockRepo.findCartItem.mockResolvedValue(makeCartItem({ quantity: 1 }))
    mockRepo.findVariantById.mockResolvedValue(makeVariant({ stock: 3 }))

    await expect(updateItem(identifier, ITEM_ID, { quantity: 5 }))
      .rejects.toThrow(InsufficientStockError)
  })
})

// ---------------------------------------------------------------------------
// removeItem
// ---------------------------------------------------------------------------

describe('removeItem', () => {
  beforeEach(() => vi.resetAllMocks())

  it('removes item and returns the updated cart', async () => {
    mockRepo.findOrCreateCart.mockResolvedValue(makeCart([]))
    mockRepo.findCartItem.mockResolvedValue(makeCartItem())
    mockRepo.deleteCartItem.mockResolvedValue(undefined)

    const result = await removeItem(identifier, ITEM_ID)

    expect(mockRepo.deleteCartItem).toHaveBeenCalledWith(ITEM_ID)
    expect(result.items).toHaveLength(0)
  })

  it('throws CartItemNotFoundError when item does not belong to cart', async () => {
    mockRepo.findOrCreateCart.mockResolvedValue(makeCart([]))
    mockRepo.findCartItem.mockResolvedValue(null)

    await expect(removeItem(identifier, ITEM_ID))
      .rejects.toThrow(CartItemNotFoundError)
  })
})

// ---------------------------------------------------------------------------
// clearCart
// ---------------------------------------------------------------------------

describe('clearCart', () => {
  beforeEach(() => vi.resetAllMocks())

  it('deletes all items and returns empty cart', async () => {
    mockRepo.findOrCreateCart.mockResolvedValue(makeCart([]))
    mockRepo.deleteAllCartItems.mockResolvedValue(undefined)

    const result = await clearCart(identifier)

    expect(mockRepo.deleteAllCartItems).toHaveBeenCalledWith(CART_ID)
    expect(result.items).toHaveLength(0)
    expect(result.totalAmount).toBe('0.00')
  })
})
