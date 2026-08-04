import { type NextRequest } from 'next/server'
import { verifyBearerToken } from '@/lib/auth'
import { logInfo, logWarn } from '@/utils/logger'
import { handleApiRoute } from '@/lib/http/route'
import { wishlistAddSchema } from '@/features/wishlist/wishlist.schema'
import {
  getWishlist,
  addToWishlist,
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

async function measureWishlistToggleStep<T>(
  step: 'auth' | 'repository' | 'response',
  context: Record<string, unknown>,
  run: () => Promise<T> | T,
): Promise<T> {
  const startedAt = Date.now()

  try {
    const result = await run()
    logInfo(`wishlist:toggle:${step}`, {
      domain: 'wishlist',
      durationMs: Date.now() - startedAt,
      ...context,
    })
    return result
  } catch (error) {
    logWarn(`wishlist:toggle:${step}:failed`, {
      domain: 'wishlist',
      durationMs: Date.now() - startedAt,
      ...context,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
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
  return handleApiRoute('GET /api/wishlist', async () => {
    logInfo('wishlist:route:start', {
      domain: 'wishlist',
      method: 'GET',
    })
    const auth = await measureRouteAwait('verifyBearerToken', {}, () => verifyBearerToken(request))
    if (!auth.ok) return auth.response

    const data = await measureRouteAwait('getWishlist', { userId: auth.userId }, () =>
      getWishlist(auth.userId),
    )
    logInfo('wishlist:route:before-response', {
      domain: 'wishlist',
      userId: auth.userId,
      itemCount: data.items.length,
    })
    logInfo('wishlist:route:response-built', {
      domain: 'wishlist',
      userId: auth.userId,
      itemCount: data.items.length,
    })
    return data
  })
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
  return handleApiRoute('POST /api/wishlist', async () => {
    const auth = await measureWishlistToggleStep('auth', { method: 'POST' }, () =>
      verifyBearerToken(request),
    )
    if (!auth.ok) return auth.response

    const body = await measureRouteAwait('request.json', {}, () => request.json())
    const { productId } = wishlistAddSchema.parse(body)

    const data = await measureWishlistToggleStep(
      'repository',
      { method: 'POST', userId: auth.userId, productId },
      () => addToWishlist(auth.userId, productId),
    )
    return measureWishlistToggleStep(
      'response',
      { method: 'POST', userId: auth.userId, productId, wished: data.wished },
      () => Promise.resolve(data),
    )
  }, { status: 201 })
}
