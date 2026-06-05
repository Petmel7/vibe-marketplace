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
import { toErrorResponse } from '@/lib/errors/handleError'

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

    return toErrorResponse('GET /api/admin/commission-rules', error)
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = createCommissionRuleSchema.parse(await request.json())
    const data = await createAdminCommissionRule(user, body)

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

    return toErrorResponse('POST /api/admin/commission-rules', error)
  }
}
