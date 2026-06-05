import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { updateCommissionRuleStatusSchema } from '@/features/commissions/commissions.schema'
import { updateAdminCommissionRuleStatus } from '@/features/commissions/commissions.service'
import { toErrorResponse } from '@/lib/errors/handleError'

interface Props {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = updateCommissionRuleStatusSchema.parse(await request.json())
    const { id } = await params
    const data = await updateAdminCommissionRuleStatus(user, id, body)

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

    return toErrorResponse('PATCH /api/admin/commission-rules/[id]/status', error)
  }
}
