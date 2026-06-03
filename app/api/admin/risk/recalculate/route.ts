import { ZodError } from 'zod'
import { riskRecalculateSchema } from '@/features/risk/risk.schema'
import { recalculateAdminRiskProfiles } from '@/features/risk/risk.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const input = riskRecalculateSchema.parse(body)
    const data = await recalculateAdminRiskProfiles(user, input)

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

    return toErrorResponse('POST /api/admin/risk/recalculate', error)
  }
}
