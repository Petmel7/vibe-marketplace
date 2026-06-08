import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { updatePayoutStatusSchema } from '@/features/payouts/payouts.schema'
import { updateAdminPayoutLifecycle } from '@/features/payouts/payouts.service'
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
    const body = updatePayoutStatusSchema.parse(await request.json())
    const { id } = await params
    const data = await updateAdminPayoutLifecycle(user, id, body)
    await recordAdminAudit({
      actorId: user.id,
      action: 'update-status',
      domain: 'payouts',
      targetId: id,
      targetType: 'payout',
      metadata: body,
      requestId: getRequestId(request),
    })

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('PATCH /api/admin/payouts/[id]/status', error)
  }
}
