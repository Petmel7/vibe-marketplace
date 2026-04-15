import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { wishlistProductIdParamSchema } from '@/features/wishlist/wishlist.schema'
import {
  removeFromWishlist,
  WishlistItemNotFoundError,
} from '@/features/wishlist/wishlist.service'

function resolveUserId(request: NextRequest): string | null {
  return request.headers.get('x-user-id')
}

/**
 * DELETE /api/wishlist/[productId]
 *
 * Remove a product from the authenticated user's wishlist.
 *
 * Headers:
 *   x-user-id  — UUID of the authenticated user (required)
 *
 * Responses:
 *   200  { success: true,  data: WishlistDto }
 *   400  { success: false, error: { message, code: 'VALIDATION_ERROR' } }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   404  { success: false, error: { message, code: 'NOT_FOUND' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
): Promise<Response> {
  try {
    const userId = resolveUserId(request)
    if (!userId) {
      return Response.json(
        {
          success: false,
          error: { message: 'Authentication required. Supply an x-user-id header.', code: 'UNAUTHORIZED' },
        },
        { status: 401 },
      )
    }

    const { productId } = wishlistProductIdParamSchema.parse(await params)

    const data = await removeFromWishlist(userId, productId)
    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            message: error.issues.map((e) => e.message).join('; '),
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 },
      )
    }

    if (error instanceof WishlistItemNotFoundError) {
      return Response.json(
        { success: false, error: { message: error.message, code: error.code } },
        { status: 404 },
      )
    }

    console.error('[DELETE /api/wishlist/[productId]] Unexpected error:', error)
    return Response.json(
      { success: false, error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    )
  }
}
