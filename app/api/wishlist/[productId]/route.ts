import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { verifyBearerToken } from '@/lib/auth'
import { toErrorResponse } from '@/lib/errors/handleError'
import { logError, logInfo, logWarn } from '@/utils/logger'
import { wishlistProductIdParamSchema } from '@/features/wishlist/wishlist.schema'
import { removeFromWishlist } from '@/features/wishlist/wishlist.service'

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

/**
 * DELETE /api/wishlist/[productId]
 *
 * Remove a product from the authenticated user's wishlist.
 *
 * Headers:
 *   Authorization: Bearer <token>  — Supabase access token (required)
 *
 * Responses:
 *   200  { success: true,  data: WishlistDto }
 *   400  { success: false, error: { message, code: 'VALIDATION_ERROR' } }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
): Promise<Response> {
  try {
    const auth = await measureWishlistToggleStep('auth', { method: 'DELETE' }, () =>
      verifyBearerToken(request),
    )
    if (!auth.ok) return auth.response

    const { productId } = wishlistProductIdParamSchema.parse(await params)

    const data = await measureWishlistToggleStep(
      'repository',
      { method: 'DELETE', userId: auth.userId, productId },
      () => removeFromWishlist(auth.userId, productId),
    )
    return measureWishlistToggleStep(
      'response',
      { method: 'DELETE', userId: auth.userId, productId, wished: data.wished },
      () => Promise.resolve(Response.json({ success: true, data }, { status: 200 })),
    )
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

    logError('DELETE /api/wishlist/[productId]', error)
    return toErrorResponse('DELETE /api/wishlist/[productId]', error)
  }
}
