import { ZodError } from 'zod'
import { deleteReportEvidence } from '@/features/abuse-reports/abuse-report-evidence.service'
import { reportEvidenceItemRouteParamsSchema } from '@/features/abuse-reports/abuse-report-evidence.schema'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

type RouteContext = { params: Promise<{ id: string; evidenceId: string }> }

export async function DELETE(_: Request, { params }: RouteContext): Promise<Response> {
  try {
    const user = await requireAuth()
    const parsed = reportEvidenceItemRouteParamsSchema.parse(await params)
    const data = await deleteReportEvidence(user, parsed.id, parsed.evidenceId)

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

    return toErrorResponse('DELETE /api/reports/[id]/evidence/[evidenceId]', error)
  }
}
