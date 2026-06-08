import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import {
  commissionRuleQuerySchema,
  createCommissionRuleSchema,
} from '@/features/commissions/commissions.schema'
import {
  createAdminCommissionRule,
  getAdminCommissionRules,
} from '@/features/commissions/commissions.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'
import { getRequestId } from '@/lib/security/request'

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const query = commissionRuleQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    )
    const data = await getAdminCommissionRules(user, query)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('GET /api/admin/commission-rules', error)
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = createCommissionRuleSchema.parse(await request.json())
    const data = await createAdminCommissionRule(user, body)
    await recordAdminAudit({
      actorId: user.id,
      action: 'create',
      domain: 'commission-rules',
      targetId: data.id,
      targetType: 'commission-rule',
      metadata: {
        scope: data.scope,
        rate: data.rate,
        isActive: data.isActive,
      },
      requestId: getRequestId(request),
    })

    return Response.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('POST /api/admin/commission-rules', error)
  }
}
