import { ZodError } from 'zod'
import { adminRefundMutationNoteSchema } from '@/features/refunds/refunds.schema'
import { approveAdminRefundRequest } from '@/features/refunds/refunds.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

interface Props {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = await request.json().catch(() => ({}))
    const input = adminRefundMutationNoteSchema.parse(body)
    const { id } = await params
    const data = await approveAdminRefundRequest(user, id, input)

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

    return toErrorResponse('POST /api/admin/refunds/[id]/approve', error)
  }
}
