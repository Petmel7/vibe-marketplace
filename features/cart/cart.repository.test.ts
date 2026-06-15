import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  cartFindUniqueMock,
  cartCreateMock,
  cartDeleteMock,
  cartItemUpsertMock,
  cartItemDeleteManyMock,
} = vi.hoisted(() => ({
  cartFindUniqueMock: vi.fn(),
  cartCreateMock: vi.fn(),
  cartDeleteMock: vi.fn(),
  cartItemUpsertMock: vi.fn(),
  cartItemDeleteManyMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (callback: (tx: unknown) => unknown) =>
      callback({
        cart: {
          findUnique: cartFindUniqueMock,
          create: cartCreateMock,
          delete: cartDeleteMock,
        },
        cartItem: {
          upsert: cartItemUpsertMock,
          deleteMany: cartItemDeleteManyMock,
        },
      }),
  },
}))

import { mergeGuestCartIntoUserCart } from './cart.repository'

function makeVariant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'variant-1',
    productId: 'product-1',
    sku: 'SKU-1',
    size: 'M',
    color: 'Black',
    price: null,
    stock: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    product: {
      id: 'product-1',
      name: 'Jacket',
      price: { toString: () => '100.00' },
      imageUrl: null,
    },
    ...overrides,
  }
}

function makeCartItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    cartId: 'guest-cart',
    variantId: 'variant-1',
    quantity: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    variant: makeVariant(),
    ...overrides,
  }
}

function makeCart(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cart-1',
    userId: null,
    sessionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
    ...overrides,
  }
}

describe('cart.repository mergeGuestCartIntoUserCart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('combines guest and user quantities safely and removes the guest cart', async () => {
    cartFindUniqueMock
      .mockResolvedValueOnce(
        makeCart({
          id: 'guest-cart',
          sessionId: 'guest-session-1',
          items: [
            makeCartItem({
              cartId: 'guest-cart',
              quantity: 2,
              variant: makeVariant({ stock: 4 }),
            }),
          ],
        }),
      )
      .mockResolvedValueOnce(
        makeCart({
          id: 'user-cart',
          userId: 'user-1',
          items: [
            makeCartItem({
              cartId: 'user-cart',
              quantity: 3,
              variant: makeVariant({ stock: 4 }),
            }),
          ],
        }),
      )
      .mockResolvedValueOnce(
        makeCart({
          id: 'user-cart',
          userId: 'user-1',
          items: [
            makeCartItem({
              cartId: 'user-cart',
              quantity: 4,
              variant: makeVariant({ stock: 4 }),
            }),
          ],
        }),
      )

    const result = await mergeGuestCartIntoUserCart('user-1', 'guest-session-1')

    expect(cartItemUpsertMock).toHaveBeenCalledWith({
      where: {
        cartId_variantId: {
          cartId: 'user-cart',
          variantId: 'variant-1',
        },
      },
      create: {
        cartId: 'user-cart',
        variantId: 'variant-1',
        quantity: 4,
      },
      update: {
        quantity: 4,
      },
    })
    expect(cartItemDeleteManyMock).toHaveBeenCalledWith({
      where: { cartId: 'guest-cart' },
    })
    expect(cartDeleteMock).toHaveBeenCalledWith({
      where: { id: 'guest-cart' },
    })
    expect(result?.items[0]?.quantity).toBe(4)
  })

  it('returns the existing user cart when no guest cart exists, making repeated merges safe', async () => {
    const userCart = makeCart({
      id: 'user-cart',
      userId: 'user-1',
      items: [
        makeCartItem({
          cartId: 'user-cart',
          quantity: 1,
        }),
      ],
    })

    cartFindUniqueMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(userCart)

    const result = await mergeGuestCartIntoUserCart('user-1', 'guest-session-1')

    expect(result).toEqual(userCart)
    expect(cartItemUpsertMock).not.toHaveBeenCalled()
    expect(cartItemDeleteManyMock).not.toHaveBeenCalled()
    expect(cartDeleteMock).not.toHaveBeenCalled()
  })
})
