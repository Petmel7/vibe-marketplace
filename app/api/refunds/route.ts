import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { createRefundRequestSchema, refundListQuerySchema } from '@/features/refunds/refunds.schema'
import { createRefundRequest, getMyRefundRequests } from '@/features/refunds/refunds.service'
import { toErrorResponse } from '@/lib/errors/handleError'
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

    return toErrorResponse('GET /api/refunds', error)
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const input = createRefundRequestSchema.parse(body)
    const data = await createRefundRequest(user, input)

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

    return toErrorResponse('POST /api/refunds', error)
  }
}
