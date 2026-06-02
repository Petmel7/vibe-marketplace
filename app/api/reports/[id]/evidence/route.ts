import { ZodError } from 'zod'
import {
  getMyReportEvidence,
  uploadReportEvidence,
} from '@/features/abuse-reports/abuse-report-evidence.service'
import { reportEvidenceRouteParamsSchema } from '@/features/abuse-reports/abuse-report-evidence.schema'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: RouteContext): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = reportEvidenceRouteParamsSchema.parse(await params)
    const data = await getMyReportEvidence(user, id)

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

    return toErrorResponse('GET /api/reports/[id]/evidence', error)
  }
}

export async function POST(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = reportEvidenceRouteParamsSchema.parse(await params)

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: { file: ['A valid evidence file is required'] },
          },
        },
        { status: 400 },
      )
    }

    const data = await uploadReportEvidence(user, id, file)
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

    return toErrorResponse('POST /api/reports/[id]/evidence', error)
  }
}
