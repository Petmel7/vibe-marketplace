import { requireAuth } from '@/lib/session/getSession'
import { markMyNotificationsReadAll } from '@/features/notifications/notifications.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function PATCH(): Promise<Response> {
  try {
    const user = await requireAuth()
    const data = await markMyNotificationsReadAll(user)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return toErrorResponse('PATCH /api/notifications/read-all', error)
  }
}
