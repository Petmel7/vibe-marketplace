import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { disputeListQuerySchema, createDisputeSchema } from '@/features/disputes/disputes.schema'
import { createDispute, getDisputes } from '@/features/disputes/disputes.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'
import { assertRateLimit, rateLimitProfiles } from '@/lib/security/rate-limit'
import { requireAuth } from '@/lib/session/getSession'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const params = Object.fromEntries(request.nextUrl.searchParams.entries())
    const query = disputeListQuerySchema.parse(params)
    const data = await getDisputes(user, query)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('GET /api/disputes', error)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    assertRateLimit(request, rateLimitProfiles.disputes, { userId: user.id })
    const body = await request.json()
    const input = createDisputeSchema.parse(body)
    const data = await createDispute(user, input)

    return Response.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('POST /api/disputes', error)
  }
}
