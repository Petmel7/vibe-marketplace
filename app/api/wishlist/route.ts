import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { verifyBearerToken } from '@/lib/auth'
import { logError, logInfo, logWarn } from '@/utils/logger'
import { toErrorResponse } from '@/lib/errors/handleError'
import { wishlistAddSchema } from '@/features/wishlist/wishlist.schema'
import {
  getWishlist,
  addToWishlist,
  ProductNotFoundError,
} from '@/features/wishlist/wishlist.service'

async function measureRouteAwait<T>(
  operation: string,
  context: Record<string, unknown>,
  run: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now()
  logInfo('wishlist:route:before', {
    domain: 'wishlist',
    operation,
    ...context,
  })

  const warningTimer = setTimeout(() => {
    logWarn('wishlist:route:slow-await', {
      domain: 'wishlist',
      operation,
      durationMs: Date.now() - startedAt,
      ...context,
    })
  }, 5000)

  try {
    const result = await run()
    logInfo('wishlist:route:after', {
      domain: 'wishlist',
      operation,
      durationMs: Date.now() - startedAt,
      ...context,
    })
    return result
  } finally {
    clearTimeout(warningTimer)
  }
}

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
    const auth = await measureRouteAwait('verifyBearerToken', {}, () => verifyBearerToken(request))
    if (!auth.ok) return auth.response

    const data = await measureRouteAwait('getWishlist', { userId: auth.userId }, () =>
      getWishlist(auth.userId),
    )
    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return toErrorResponse('GET /api/wishlist', error)
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
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await measureRouteAwait('verifyBearerToken', {}, () => verifyBearerToken(request))
    if (!auth.ok) return auth.response

    const body = await measureRouteAwait('request.json', {}, () => request.json())
    const { productId } = wishlistAddSchema.parse(body)

    const data = await measureRouteAwait('addToWishlist', { userId: auth.userId, productId }, () =>
      addToWishlist(auth.userId, productId),
    )
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

    return toErrorResponse('POST /api/wishlist', error)
  }
}
