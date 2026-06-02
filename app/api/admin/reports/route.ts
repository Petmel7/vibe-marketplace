import { ZodError } from 'zod'
import { adminReportsQuerySchema } from '@/features/abuse-reports/abuse-reports.schema'
import { getAdminReports } from '@/features/abuse-reports/abuse-reports.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const query = adminReportsQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    )
    const data = await getAdminReports(user, query)

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

    return toErrorResponse('GET /api/admin/reports', error)
  }
}
