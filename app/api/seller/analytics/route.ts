import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { sellerAnalyticsQuerySchema } from '@/features/analytics/analytics.schema'
import { getMyAnalytics } from '@/features/seller/analytics/seller-analytics.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * GET /api/seller/analytics
 * Returns aggregated sales analytics for the seller's store.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const query = sellerAnalyticsQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    )
    const data = await getMyAnalytics(user, query)
    return Response.json({ success: true, data })
  } catch (err) {
    if (err instanceof ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            message: err.issues.map((issue) => issue.message).join('; '),
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 },
      )
    }

    return toErrorResponse('GET /api/seller/analytics', err)
  }
}
