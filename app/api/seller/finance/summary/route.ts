import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { getSellerFinanceSummary } from '@/features/payouts/payouts.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { z } from 'zod'

const sellerFinanceSummaryQuerySchema = z.object({
  storeId: z.uuid().optional(),
})

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const query = sellerFinanceSummaryQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    )
    const data = await getSellerFinanceSummary(user, query)

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

    return toErrorResponse('GET /api/seller/finance/summary', error)
  }
}
