import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { analyticsQuerySchema } from '@/features/analytics/analytics.schema'
import { getMarketplaceAnalytics } from '@/features/admin/analytics/admin-analytics.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * GET /api/admin/analytics
 *
 * Returns marketplace-wide analytics (admin only).
 *
 * Responses:
 *   200  { success: true, data: AdminAnalyticsDto }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   403  { success: false, error: { message, code: 'FORBIDDEN' } }
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const query = analyticsQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    )
    const data = await getMarketplaceAnalytics(user, query)
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

    return toErrorResponse('GET /api/admin/analytics', err)
  }
}
