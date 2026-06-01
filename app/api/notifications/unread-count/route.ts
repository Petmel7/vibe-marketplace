import { requireAuth } from '@/lib/session/getSession'
import { getMyUnreadNotificationCount } from '@/features/notifications/notifications.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function GET(): Promise<Response> {
  try {
    const user = await requireAuth()
    const data = await getMyUnreadNotificationCount(user)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return toErrorResponse('GET /api/notifications/unread-count', error)
  }
}
