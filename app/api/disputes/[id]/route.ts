import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { disputeIdParamSchema } from '@/features/disputes/disputes.schema'
import { getDisputeById } from '@/features/disputes/disputes.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = disputeIdParamSchema.parse(await params)
    const data = await getDisputeById(user, id)

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

    return toErrorResponse('GET /api/disputes/[id]', error)
  }
}
