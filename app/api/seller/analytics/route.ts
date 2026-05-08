import { requireAuth } from '@/lib/session/getSession'
import { getMyAnalytics } from '@/features/seller/analytics/seller-analytics.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * GET /api/seller/analytics
 * Returns aggregated sales analytics for the seller's store.
 */
export async function GET(): Promise<Response> {
  try {
    const user = await requireAuth()
    const data = await getMyAnalytics(user)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/seller/analytics', err)
  }
}
