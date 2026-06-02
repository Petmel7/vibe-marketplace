import { ZodError } from 'zod'
import {
  disputeIdParamSchema,
  updateDisputeStatusSchema,
} from '@/features/disputes/disputes.schema'
import { updateAdminDisputeStatus } from '@/features/disputes/disputes.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = disputeIdParamSchema.parse(await params)
    const body = await request.json()
    const input = updateDisputeStatusSchema.parse(body)
    const data = await updateAdminDisputeStatus(user, id, input)

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

    return toErrorResponse('PATCH /api/admin/disputes/[id]/status', error)
  }
}
