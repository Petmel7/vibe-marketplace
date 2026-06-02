import { ZodError } from 'zod'
import { getMyReports } from '@/features/abuse-reports/abuse-reports.service'
import { myReportsQuerySchema } from '@/features/abuse-reports/abuse-reports.schema'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const query = myReportsQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    )
    const data = await getMyReports(user, query)

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

    return toErrorResponse('GET /api/profile/reports', error)
  }
}
