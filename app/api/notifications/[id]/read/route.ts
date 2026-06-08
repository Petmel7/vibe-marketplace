import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { notificationIdParamSchema } from '@/features/notifications/notifications.schema'
import { markMyNotificationRead } from '@/features/notifications/notifications.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'
import { assertRateLimit, rateLimitProfiles } from '@/lib/security/rate-limit'

interface Props {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    assertRateLimit(request, rateLimitProfiles.notificationMutations, { userId: user.id })
    const parsed = notificationIdParamSchema.parse(await params)
    const data = await markMyNotificationRead(user, parsed.id)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('PATCH /api/notifications/[id]/read', error)
  }
}
