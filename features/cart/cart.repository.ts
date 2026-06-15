import { prisma } from '@/lib/prisma'
import type { Cart, CartItem, ProductVariant, Product } from '@/app/generated/prisma/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CartItemWithVariant extends CartItem {
  variant: ProductVariant & { product: Product }
}

export interface CartWithItems extends Cart {
  items: CartItemWithVariant[]
}

export interface CartIdentifier {
  userId?: string
  sessionId?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function identifierWhere(identifier: CartIdentifier) {
  if (identifier.userId) return { userId: identifier.userId }
  return { sessionId: identifier.sessionId }
}

const ITEM_INCLUDE = {
  variant: {
    include: { product: true },
  },
} as const

// ---------------------------------------------------------------------------
// Cart queries
// ---------------------------------------------------------------------------

/**
 * Find an existing cart for the given identifier (userId or sessionId).
 * Returns null when no cart exists yet.
 */
export async function findCart(
  identifier: CartIdentifier
): Promise<CartWithItems | null> {
  return prisma.cart.findFirst({
    where: identifierWhere(identifier),
    include: { items: { include: ITEM_INCLUDE } },
  }) as Promise<CartWithItems | null>
}

/**
 * Find a cart by its primary key, including all items with variant + product.
 * Returns null when not found.
 */
export async function findCartById(id: string): Promise<CartWithItems | null> {
  return prisma.cart.findUnique({
    where: { id },
    include: { items: { include: ITEM_INCLUDE } },
  }) as Promise<CartWithItems | null>
}

/**
 * Create a new cart for the given identifier.
 */
export async function createCart(
  identifier: CartIdentifier
): Promise<CartWithItems> {
  return prisma.cart.create({
    data: identifierWhere(identifier),
    include: { items: { include: ITEM_INCLUDE } },
  }) as Promise<CartWithItems>
}

/**
 * Find an existing cart or create one if none exists.
 * The returned cart always includes items with their variant + product.
 */
export async function findOrCreateCart(
  identifier: CartIdentifier
): Promise<CartWithItems> {
  const existing = await findCart(identifier)
  if (existing) return existing
  return createCart(identifier)
}

// ---------------------------------------------------------------------------
// CartItem queries
// ---------------------------------------------------------------------------

/**
 * Find a single cart item by its ID that belongs to the given cart.
 * Used to verify ownership before mutation.
 */
export async function findCartItem(
  cartId: string,
  itemId: string
): Promise<CartItemWithVariant | null> {
  return prisma.cartItem.findFirst({
    where: { id: itemId, cartId },
    include: ITEM_INCLUDE,
  }) as Promise<CartItemWithVariant | null>
}

/**
 * Find a variant by ID, including stock information.
 * Returns null when not found.
 */
export async function findVariantById(
  variantId: string
): Promise<ProductVariant | null> {
  return prisma.productVariant.findUnique({ where: { id: variantId } })
}

/**
 * Atomically upsert a cart item:
 * - If no item for (cartId, variantId) exists → create with given quantity.
 * - If one exists → increment its quantity by the given amount.
 *
 * Uses Prisma's built-in upsert to eliminate the read-then-write race condition.
 */
export async function upsertCartItem(
  cartId: string,
  variantId: string,
  quantity: number
): Promise<void> {
  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId, variantId } },
    create: { cartId, variantId, quantity },
    update: { quantity: { increment: quantity } },
  })
}

/**
 * Set the absolute quantity of a cart item (used by PATCH endpoint).
 */
export async function updateCartItemQuantity(
  itemId: string,
  quantity: number
): Promise<void> {
  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  })
}

/**
 * Delete a single cart item by ID.
 */
export async function deleteCartItem(itemId: string): Promise<void> {
  await prisma.cartItem.delete({ where: { id: itemId } })
}

/**
 * Delete all items belonging to a cart (clear operation).
 */
export async function deleteAllCartItems(cartId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { cartId } })
}

/**
 * Merge an anonymous session cart into the authenticated user's cart.
 *
 * - Guest items are folded into the user cart by variant id.
 * - Quantities are combined and clamped to available stock.
 * - Variants with zero stock are skipped during merge.
 * - The guest cart is removed after a successful merge to keep the operation idempotent.
 */
export async function mergeGuestCartIntoUserCart(
  userId: string,
  sessionId: string
): Promise<CartWithItems | null> {
  return prisma.$transaction(async (tx) => {
    const guestCart = await tx.cart.findUnique({
      where: { sessionId },
      include: { items: { include: ITEM_INCLUDE } },
    }) as CartWithItems | null

    const existingUserCart = await tx.cart.findUnique({
      where: { userId },
      include: { items: { include: ITEM_INCLUDE } },
    }) as CartWithItems | null

    if (!guestCart) {
      return existingUserCart
    }

    const userCart = existingUserCart ??
      (await tx.cart.create({
        data: { userId },
        include: { items: { include: ITEM_INCLUDE } },
      }) as CartWithItems)

    const mergedQuantities = new Map(
      userCart.items.map((item) => [item.variantId, item.quantity])
    )

    for (const guestItem of guestCart.items) {
      const availableStock = guestItem.variant.stock
      if (availableStock <= 0) {
        continue
      }

      const currentQuantity = mergedQuantities.get(guestItem.variantId) ?? 0
      const nextQuantity = Math.min(
        availableStock,
        currentQuantity + guestItem.quantity
      )

      await tx.cartItem.upsert({
        where: {
          cartId_variantId: {
            cartId: userCart.id,
            variantId: guestItem.variantId,
          },
        },
        create: {
          cartId: userCart.id,
          variantId: guestItem.variantId,
          quantity: nextQuantity,
        },
        update: {
          quantity: nextQuantity,
        },
      })

      mergedQuantities.set(guestItem.variantId, nextQuantity)
    }

    await tx.cartItem.deleteMany({
      where: { cartId: guestCart.id },
    })

    await tx.cart.delete({
      where: { id: guestCart.id },
    })

    return tx.cart.findUnique({
      where: { id: userCart.id },
      include: { items: { include: ITEM_INCLUDE } },
    }) as Promise<CartWithItems | null>
  })
}
