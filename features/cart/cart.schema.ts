import { z } from 'zod'

/**
 * Body for POST /api/cart/items — add a variant to the cart.
 *
 * quantity: how many units to add (stacks with any existing qty for that variant).
 */
export const addCartItemSchema = z.object({
  variantId: z.string().uuid({ error: 'variantId must be a valid UUID' }),
  quantity: z.coerce
    .number({ error: 'quantity must be a number' })
    .int({ error: 'quantity must be an integer' })
    .min(1, { error: 'quantity must be at least 1' })
    .max(100, { error: 'quantity must not exceed 100' }),
})

export type AddCartItemInput = z.infer<typeof addCartItemSchema>

/**
 * Body for PATCH /api/cart/items/[itemId] — set an absolute quantity.
 *
 * quantity: the new desired quantity (replaces the existing value).
 */
export const updateCartItemSchema = z.object({
  quantity: z.coerce
    .number({ error: 'quantity must be a number' })
    .int({ error: 'quantity must be an integer' })
    .min(1, { error: 'quantity must be at least 1' })
    .max(100, { error: 'quantity must not exceed 100' }),
})

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>

/**
 * Path param for item-level routes.
 */
export const cartItemIdParamSchema = z.object({
  itemId: z.string().uuid({ error: 'itemId must be a valid UUID' }),
})

export type CartItemIdParam = z.infer<typeof cartItemIdParamSchema>
