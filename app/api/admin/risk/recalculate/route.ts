import { ZodError } from 'zod'
import { riskRecalculateSchema } from '@/features/risk/risk.schema'
import { recalculateAdminRiskProfiles } from '@/features/risk/risk.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'
import { getRequestId } from '@/lib/security/request'
import { requireAuth } from '@/lib/session/getSession'

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const input = riskRecalculateSchema.parse(body)
    const data = await recalculateAdminRiskProfiles(user, input)
    await recordAdminAudit({
      actorId: user.id,
      action: 'recalculate',
      domain: 'risk',
      targetType: 'risk-profile-batch',
      metadata: input,
      requestId: getRequestId(request),
    })

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('POST /api/admin/risk/recalculate', error)
  }
}
