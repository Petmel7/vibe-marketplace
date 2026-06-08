import { requireAuth } from '@/lib/session/getSession'
import { markMyNotificationsReadAll } from '@/features/notifications/notifications.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { assertRateLimit, rateLimitProfiles } from '@/lib/security/rate-limit'

export async function PATCH(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    assertRateLimit(request, rateLimitProfiles.notificationMutations, { userId: user.id })
    const data = await markMyNotificationsReadAll(user)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return toErrorResponse('PATCH /api/notifications/read-all', error)
  }
}
