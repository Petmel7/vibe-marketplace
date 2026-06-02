import { ZodError } from 'zod'
import { disputeIdParamSchema } from '@/features/disputes/disputes.schema'
import { uploadDisputeEvidence } from '@/features/disputes/disputes.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = disputeIdParamSchema.parse(await params)
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'A valid evidence file is required',
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 },
      )
    }

    const data = await uploadDisputeEvidence(user, id, file)
    return Response.json({ success: true, data }, { status: 201 })
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

    return toErrorResponse('POST /api/disputes/[id]/evidence', error)
  }
}
