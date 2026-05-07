import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { getMyOrderById } from '@/features/orders/orders.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * GET /api/orders/[id]
 *
 * Returns a single order for the authenticated buyer.
 *
 * Responses:
 *   200  { success: true, data: OrderDetailDto }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   403  { success: false, error: { message, code: 'FORBIDDEN' } }
 *   404  { success: false, error: { message, code: 'ORDER_NOT_FOUND' } }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const data = await getMyOrderById(user, id)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/orders/[id]', err)
  }
}
