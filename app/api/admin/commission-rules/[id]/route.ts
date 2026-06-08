import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { updateCommissionRuleSchema } from '@/features/commissions/commissions.schema'
import {
  archiveAdminCommissionRule,
  getAdminCommissionRuleById,
  updateAdminCommissionRule,
} from '@/features/commissions/commissions.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'
import { getRequestId } from '@/lib/security/request'

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
    await recordAdminAudit({
      actorId: user.id,
      action: 'update',
      domain: 'commission-rules',
      targetId: id,
      targetType: 'commission-rule',
      metadata: body,
      requestId: getRequestId(request),
    })

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('PATCH /api/admin/commission-rules/[id]', error)
  }
}

export async function DELETE(request: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    await archiveAdminCommissionRule(user, id)
    await recordAdminAudit({
      actorId: user.id,
      action: 'archive',
      domain: 'commission-rules',
      targetId: id,
      targetType: 'commission-rule',
      requestId: getRequestId(request),
    })

    return Response.json({ success: true, data: null }, { status: 200 })
  } catch (error) {
    return toErrorResponse('DELETE /api/admin/commission-rules/[id]', error)
  }
}
