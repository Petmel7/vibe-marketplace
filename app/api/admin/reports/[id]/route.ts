import { ZodError } from 'zod'
import {
  getAdminReportById,
} from '@/features/abuse-reports/abuse-reports.service'
import { reportIdParamSchema } from '@/features/abuse-reports/abuse-reports.schema'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: RouteContext): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = reportIdParamSchema.parse(await params)
    const data = await getAdminReportById(user, id)

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

    return toErrorResponse('GET /api/admin/reports/[id]', error)
  }
}
