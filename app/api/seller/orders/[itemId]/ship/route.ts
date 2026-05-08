import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { markAsShipped } from '@/features/seller/orders/seller-order.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * POST /api/seller/orders/[itemId]/ship
 * Transitions a PROCESSING order item to SHIPPED.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { itemId } = await params
    const data = await markAsShipped(user, itemId)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('POST /api/seller/orders/[itemId]/ship', err)
  }
}
