import { ZodError } from 'zod'
import { createAbuseReportSchema } from '@/features/abuse-reports/abuse-reports.schema'
import { createReport } from '@/features/abuse-reports/abuse-reports.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'
import { assertRateLimit, rateLimitProfiles } from '@/lib/security/rate-limit'
import { requireAuth } from '@/lib/session/getSession'

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    assertRateLimit(request, rateLimitProfiles.reports, { userId: user.id })
    const body = await request.json()
    const input = createAbuseReportSchema.parse(body)
    const data = await createReport(user, input)

    return Response.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('POST /api/reports', error)
  }
}
