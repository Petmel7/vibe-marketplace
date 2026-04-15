import { z } from 'zod'

/**
 * Request body for POST /api/wishlist — add a product to the wishlist.
 */
export const wishlistAddSchema = z.object({
  productId: z.string().uuid({ error: 'productId must be a valid UUID' }),
})

export type WishlistAddInput = z.infer<typeof wishlistAddSchema>

/**
 * Path parameter for DELETE /api/wishlist/[productId].
 */
export const wishlistProductIdParamSchema = z.object({
  productId: z.string().uuid({ error: 'productId must be a valid UUID' }),
})

export type WishlistProductIdParam = z.infer<typeof wishlistProductIdParamSchema>
