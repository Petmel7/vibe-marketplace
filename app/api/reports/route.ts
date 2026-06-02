import { ZodError } from 'zod'
import { createAbuseReportSchema } from '@/features/abuse-reports/abuse-reports.schema'
import { createReport } from '@/features/abuse-reports/abuse-reports.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const input = createAbuseReportSchema.parse(body)
    const data = await createReport(user, input)

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

    return toErrorResponse('POST /api/reports', error)
  }
}
