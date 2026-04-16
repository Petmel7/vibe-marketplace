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
