import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { markAsDelivered } from '@/features/seller/orders/seller-order.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * POST /api/seller/orders/[itemId]/deliver
 * Transitions a SHIPPED order item to DELIVERED.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { itemId } = await params
    const data = await markAsDelivered(user, itemId)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('POST /api/seller/orders/[itemId]/deliver', err)
  }
}
