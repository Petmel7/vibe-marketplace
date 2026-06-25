import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncUser } from '@/features/auth/auth.service'
import { mergeGuestCartIntoUserCart } from '@/features/cart/cart.service'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors/auth'
import { assertRateLimit, rateLimitProfiles } from '@/lib/security/rate-limit'
import { logError } from '@/utils/logger'
import { measureServerOperation } from '@/lib/observability/server-timing'

export async function POST(request: NextRequest) {
  try {
    assertRateLimit(request, rateLimitProfiles.auth)

    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const adminClient = createAdminClient()
    const { data, error } = await measureServerOperation(
      'authSync.getUser',
      {
        route: '/api/auth/sync',
        externalApi: 'supabase.auth.getUser',
      },
      () => adminClient.auth.getUser(token),
    )

    if (error || !data.user) {
      return Response.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    const sessionUser = await measureServerOperation(
      'authSync.syncUser',
      {
        route: '/api/auth/sync',
        auth: 'syncUser',
        userId: data.user.id,
      },
      () => syncUser(data.user),
    )
    const guestSessionId = request.headers.get('x-session-id')

    if (guestSessionId) {
      try {
        await measureServerOperation(
          'authSync.mergeGuestCart',
          {
            route: '/api/auth/sync',
            auth: 'mergeGuestCart',
            userId: sessionUser.id,
          },
          () => mergeGuestCartIntoUserCart(sessionUser.id, guestSessionId),
        )
      } catch (mergeError) {
        logError('POST /api/auth/sync merge guest cart', mergeError, {
          domain: 'auth',
          userId: sessionUser.id,
          guestSessionId,
        })
      }
    }

    return Response.json({ success: true, data: sessionUser })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return Response.json(
        { success: false, error: { message: err.message, code: err.code } },
        { status: 401 }
      )
    }
    if (err instanceof ForbiddenError) {
      return Response.json(
        { success: false, error: { message: err.message, code: err.code } },
        { status: 403 }
      )
    }
    logError('POST /api/auth/sync', err)
    return Response.json(
      { success: false, error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
