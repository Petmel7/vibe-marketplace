import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { previewCommissionRuleSchema } from '@/features/commissions/commissions.schema'
import { previewAdminCommissionRule } from '@/features/commissions/commissions.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = previewCommissionRuleSchema.parse(await request.json())
    const data = await previewAdminCommissionRule(user, body)

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

    return toErrorResponse('POST /api/admin/commission-rules/preview', error)
  }
}
