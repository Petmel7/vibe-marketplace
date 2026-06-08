import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { updateCommissionRuleStatusSchema } from '@/features/commissions/commissions.schema'
import { updateAdminCommissionRuleStatus } from '@/features/commissions/commissions.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'
import { getRequestId } from '@/lib/security/request'

interface Props {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = updateCommissionRuleStatusSchema.parse(await request.json())
    const { id } = await params
    const data = await updateAdminCommissionRuleStatus(user, id, body)
    await recordAdminAudit({
      actorId: user.id,
      action: 'update-status',
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

    return toErrorResponse('PATCH /api/admin/commission-rules/[id]/status', error)
  }
}
