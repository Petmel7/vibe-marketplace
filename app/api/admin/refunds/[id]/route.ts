import { ZodError } from 'zod'
import { getAdminRefundRequestById } from '@/features/refunds/refunds.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const data = await getAdminRefundRequestById(user, id)

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

    return toErrorResponse('GET /api/admin/refunds/[id]', error)
  }
}
