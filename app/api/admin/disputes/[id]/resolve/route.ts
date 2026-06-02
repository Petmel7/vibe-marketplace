import { ZodError } from 'zod'
import {
  disputeIdParamSchema,
  resolveDisputeSchema,
} from '@/features/disputes/disputes.schema'
import { resolveAdminDispute } from '@/features/disputes/disputes.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = disputeIdParamSchema.parse(await params)
    const body = await request.json()
    const input = resolveDisputeSchema.parse(body)
    const data = await resolveAdminDispute(user, id, input)

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

    return toErrorResponse('POST /api/admin/disputes/[id]/resolve', error)
  }
}
