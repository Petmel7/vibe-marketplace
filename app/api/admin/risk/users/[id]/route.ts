import { ZodError } from 'zod'
import { riskTargetIdParamSchema } from '@/features/risk/risk.schema'
import { getAdminUserRiskProfileById } from '@/features/risk/risk.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: RouteContext): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = riskTargetIdParamSchema.parse(await params)
    const data = await getAdminUserRiskProfileById(user, id)

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

    return toErrorResponse('GET /api/admin/risk/users/[id]', error)
  }
}
