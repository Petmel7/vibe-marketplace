import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { verifyBearerToken } from '@/lib/auth'
import { logError } from '@/lib/logger'
import { wishlistAddSchema } from '@/features/wishlist/wishlist.schema'
import {
  getWishlist,
  addToWishlist,
  ProductNotFoundError,
  ProductAlreadyInWishlistError,
} from '@/features/wishlist/wishlist.service'

// ---------------------------------------------------------------------------
// GET /api/wishlist
// ---------------------------------------------------------------------------

/**
 * GET /api/wishlist
 *
 * Returns the authenticated user's wishlist (created lazily on first request).
 *
 * Headers:
 *   Authorization: Bearer <token>  — Supabase access token (required)
 *
 * Responses:
 *   200  { success: true,  data: WishlistDto }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const auth = await verifyBearerToken(request)
    if (!auth.ok) return auth.response

    const data = await getWishlist(auth.userId)
    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    logError('GET /api/wishlist', error)
    return Response.json(
      { success: false, error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// POST /api/wishlist
// ---------------------------------------------------------------------------

/**
 * POST /api/wishlist
 *
 * Add a product to the authenticated user's wishlist.
 *
 * Headers:
 *   Authorization: Bearer <token>  — Supabase access token (required)
 *
 * Body: { productId: string (UUID) }
 *
 * Responses:
 *   201  { success: true,  data: WishlistDto }
 *   400  { success: false, error: { message, code: 'VALIDATION_ERROR' } }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   404  { success: false, error: { message, code: 'NOT_FOUND' } }
 *   409  { success: false, error: { message, code: 'ALREADY_IN_WISHLIST' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await verifyBearerToken(request)
    if (!auth.ok) return auth.response

    const body = await request.json()
    const { productId } = wishlistAddSchema.parse(body)

    const data = await addToWishlist(auth.userId, productId)
    return Response.json({ success: true, data }, { status: 201 })
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

    if (error instanceof ProductNotFoundError) {
      return Response.json(
        { success: false, error: { message: error.message, code: error.code } },
        { status: 404 },
      )
    }

    if (error instanceof ProductAlreadyInWishlistError) {
      return Response.json(
        { success: false, error: { message: error.message, code: error.code } },
        { status: 409 },
      )
    }

    logError('POST /api/wishlist', error)
    return Response.json(
      { success: false, error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    )
  }
}
