import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { sellerRefundListQuerySchema } from '@/features/refunds/refunds.schema'
import { getSellerRefundRequests } from '@/features/refunds/refunds.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const params = Object.fromEntries(request.nextUrl.searchParams.entries())
    const query = sellerRefundListQuerySchema.parse(params)
    const data = await getSellerRefundRequests(user, query)

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

    return toErrorResponse('GET /api/seller/refunds', error)
  }
}
