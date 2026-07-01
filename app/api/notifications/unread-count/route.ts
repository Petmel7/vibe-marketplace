import { type NextRequest } from 'next/server'
import { verifyBearerToken } from '@/lib/auth'
import { getUnreadNotificationCountByUserId } from '@/features/notifications/notifications.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { logInfo, logWarn } from '@/utils/logger'

async function measureRouteAwait<T>(
  operation: string,
  run: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now()
  logInfo('notifications:unread-count:before', {
    domain: 'notifications',
    operation,
  })

  const warningTimer = setTimeout(() => {
    logWarn('notifications:unread-count:slow-await', {
      domain: 'notifications',
      operation,
      durationMs: Date.now() - startedAt,
    })
  }, 5000)

  try {
    const result = await run()
    logInfo('notifications:unread-count:after', {
      domain: 'notifications',
      operation,
      durationMs: Date.now() - startedAt,
    })
    return result
  } finally {
    clearTimeout(warningTimer)
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const auth = await measureRouteAwait('verifyBearerToken', () => verifyBearerToken(request))
    if (!auth.ok) {
      return auth.response
    }

    const data = await measureRouteAwait('getUnreadNotificationCountByUserId', () =>
      getUnreadNotificationCountByUserId(auth.userId),
    )

    logInfo('notifications:unread-count:response', {
      domain: 'notifications',
      count: data.count,
    })
    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return toErrorResponse('GET /api/notifications/unread-count', error)
  }
}
