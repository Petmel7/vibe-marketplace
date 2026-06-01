import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { notificationIdParamSchema } from '@/features/notifications/notifications.schema'
import { deleteMyNotification } from '@/features/notifications/notifications.service'
import { toErrorResponse } from '@/lib/errors/handleError'

interface Props {
  params: Promise<{ id: string }>
}

export async function DELETE(_: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const parsed = notificationIdParamSchema.parse(await params)
    const data = await deleteMyNotification(user, parsed.id)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            message: error.issues.map((issue) => issue.message).join('; '),
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 },
      )
    }

    return toErrorResponse('DELETE /api/notifications/[id]', error)
  }
}
