import Decimal from 'decimal.js'
import {
  findOrCreateCart,
  findCartItem,
  findVariantById,
  upsertCartItem,
  updateCartItemQuantity,
  deleteCartItem,
  deleteAllCartItems,
  type CartIdentifier,
  type CartWithItems,
  type CartItemWithVariant,
} from '@/features/cart/cart.repository'
import type {
  CartDto,
  CartItemDto,
  CartVariantDto,
} from '@/features/cart/cart.dto'
import type {
  AddCartItemInput,
  UpdateCartItemInput,
} from '@/features/cart/cart.schema'

// ---------------------------------------------------------------------------
// Typed application errors
// ---------------------------------------------------------------------------

export class CartItemNotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const
  constructor(itemId: string) {
    super(`Cart item "${itemId}" was not found in this cart`)
    this.name = 'CartItemNotFoundError'
  }
}

export class InsufficientStockError extends Error {
  readonly code = 'INSUFFICIENT_STOCK' as const
  constructor(variantId: string, available: number, requested: number) {
    super(
      `Variant "${variantId}" has only ${available} unit(s) in stock; ` +
      `cannot fulfil requested quantity of ${requested}`
    )
    this.name = 'InsufficientStockError'
  }
}

export class VariantNotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const
  constructor(variantId: string) {
    super(`Product variant "${variantId}" was not found`)
    this.name = 'VariantNotFoundError'
  }
}

// ---------------------------------------------------------------------------
// DTO mappers
// ---------------------------------------------------------------------------

function toCartVariantDto(variant: CartItemWithVariant['variant']): CartVariantDto {
  return {
    id: variant.id,
    sku: variant.sku,
    size: variant.size ?? null,
    color: variant.color ?? null,
    price: variant.price != null ? variant.price.toString() : null,
    stock: variant.stock,
    product: {
      id: variant.product.id,
      name: variant.product.name,
      price: variant.product.price.toString(),
      imageUrl: variant.product.imageUrl ?? null,
    },
  }
}

/**
 * Effective unit price: variant override if set, else product base price.
 */
function effectivePrice(variant: CartItemWithVariant['variant']): Decimal {
  return variant.price != null
    ? new Decimal(variant.price.toString())
    : new Decimal(variant.product.price.toString())
}

function toCartItemDto(item: CartItemWithVariant): CartItemDto {
  const unitPrice = effectivePrice(item.variant)
  const lineTotal = unitPrice.mul(item.quantity)

  return {
    id: item.id,
    variantId: item.variantId,
    quantity: item.quantity,
    unitPrice: unitPrice.toFixed(2),
    lineTotal: lineTotal.toFixed(2),
    variant: toCartVariantDto(item.variant),
  }
}

function toCartDto(cart: CartWithItems): CartDto {
  const items = cart.items.map(toCartItemDto)

  const totalAmount = items.reduce(
    (sum, item) => sum.plus(item.lineTotal),
    new Decimal(0)
  )

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  return {
    id: cart.id,
    items,
    totalAmount: totalAmount.toFixed(2),
    itemCount,
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Get (or create) the cart for the given identifier.
 * Always returns a CartDto — creates an empty cart if none exists.
 */
export async function getCart(identifier: CartIdentifier): Promise<CartDto> {
  const cart = await findOrCreateCart(identifier)
  return toCartDto(cart)
}

/**
 * Add a variant to the cart.
 *
 * - Validates the variant exists.
 * - Checks that existing cart quantity + new quantity does not exceed stock.
 * - Increments an existing line item or creates a new one.
 */
export async function addItem(
  identifier: CartIdentifier,
  input: AddCartItemInput
): Promise<CartDto> {
  const variant = await findVariantById(input.variantId)
  if (!variant) throw new VariantNotFoundError(input.variantId)

  const cart = await findOrCreateCart(identifier)

  const existingItem = cart.items.find((i) => i.variantId === input.variantId)
  const currentQty = existingItem?.quantity ?? 0
  const requestedTotal = currentQty + input.quantity

  if (requestedTotal > variant.stock) {
    throw new InsufficientStockError(input.variantId, variant.stock, requestedTotal)
  }

  await upsertCartItem(cart.id, input.variantId, input.quantity)

  const updated = await findOrCreateCart(identifier)
  return toCartDto(updated)
}

/**
 * Set the absolute quantity of a cart item.
 *
 * - Validates the item exists and belongs to the caller's cart.
 * - Validates the new quantity does not exceed available stock.
 */
export async function updateItem(
  identifier: CartIdentifier,
  itemId: string,
  input: UpdateCartItemInput
): Promise<CartDto> {
  const cart = await findOrCreateCart(identifier)

  const item = await findCartItem(cart.id, itemId)
  if (!item) throw new CartItemNotFoundError(itemId)

  const variant = await findVariantById(item.variantId)
  if (!variant) throw new VariantNotFoundError(item.variantId)

  if (input.quantity > variant.stock) {
    throw new InsufficientStockError(item.variantId, variant.stock, input.quantity)
  }

  await updateCartItemQuantity(itemId, input.quantity)

  const updated = await findOrCreateCart(identifier)
  return toCartDto(updated)
}

/**
 * Remove a single item from the cart.
 *
 * Throws CartItemNotFoundError if the item does not exist in this cart.
 */
export async function removeItem(
  identifier: CartIdentifier,
  itemId: string
): Promise<CartDto> {
  const cart = await findOrCreateCart(identifier)

  const item = await findCartItem(cart.id, itemId)
  if (!item) throw new CartItemNotFoundError(itemId)

  await deleteCartItem(itemId)

  const updated = await findOrCreateCart(identifier)
  return toCartDto(updated)
}

/**
 * Remove all items from the cart.
 */
export async function clearCart(identifier: CartIdentifier): Promise<CartDto> {
  const cart = await findOrCreateCart(identifier)
  await deleteAllCartItems(cart.id)

  const updated = await findOrCreateCart(identifier)
  return toCartDto(updated)
}
