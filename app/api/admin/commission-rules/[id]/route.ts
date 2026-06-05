import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { updateCommissionRuleSchema } from '@/features/commissions/commissions.schema'
import {
  archiveAdminCommissionRule,
  getAdminCommissionRuleById,
  updateAdminCommissionRule,
} from '@/features/commissions/commissions.service'
import { toErrorResponse } from '@/lib/errors/handleError'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const data = await getAdminCommissionRuleById(user, id)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return toErrorResponse('GET /api/admin/commission-rules/[id]', error)
  }
}

export async function PATCH(request: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = updateCommissionRuleSchema.parse(await request.json())
    const { id } = await params
    const data = await updateAdminCommissionRule(user, id, body)

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

    return toErrorResponse('PATCH /api/admin/commission-rules/[id]', error)
  }
}

export async function DELETE(_: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    await archiveAdminCommissionRule(user, id)

    return Response.json({ success: true, data: null }, { status: 200 })
  } catch (error) {
    return toErrorResponse('DELETE /api/admin/commission-rules/[id]', error)
  }
}
