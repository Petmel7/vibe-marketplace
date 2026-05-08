import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { getMyOrderItemById } from '@/features/seller/orders/seller-order.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * GET /api/seller/orders/[itemId]
 * Returns a single order item belonging to the seller's store.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { itemId } = await params
    const data = await getMyOrderItemById(user, itemId)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/seller/orders/[itemId]', err)
  }
}
