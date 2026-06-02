import { ZodError } from 'zod'
import { getAdminReportEvidence } from '@/features/abuse-reports/abuse-report-evidence.service'
import { reportEvidenceRouteParamsSchema } from '@/features/abuse-reports/abuse-report-evidence.schema'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: RouteContext): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = reportEvidenceRouteParamsSchema.parse(await params)
    const data = await getAdminReportEvidence(user, id)

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

    return toErrorResponse('GET /api/admin/reports/[id]/evidence', error)
  }
}
