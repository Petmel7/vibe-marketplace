import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { createRefundRequestSchema, refundListQuerySchema } from '@/features/refunds/refunds.schema'
import { createRefundRequest, getMyRefundRequests } from '@/features/refunds/refunds.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'
import { assertRateLimit, rateLimitProfiles } from '@/lib/security/rate-limit'
import { requireAuth } from '@/lib/session/getSession'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const params = Object.fromEntries(request.nextUrl.searchParams.entries())
    const query = refundListQuerySchema.parse(params)
    const data = await getMyRefundRequests(user, query)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('GET /api/refunds', error)
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    assertRateLimit(request, rateLimitProfiles.refunds, { userId: user.id })
    const body = await request.json()
    const input = createRefundRequestSchema.parse(body)
    const data = await createRefundRequest(user, input)

    return Response.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('POST /api/refunds', error)
  }
}
