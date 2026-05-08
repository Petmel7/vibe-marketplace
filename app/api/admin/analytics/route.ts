import { requireAuth } from '@/lib/session/getSession'
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
export async function GET(): Promise<Response> {
  try {
    const user = await requireAuth()
    const data = await getMarketplaceAnalytics(user)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/admin/analytics', err)
  }
}
