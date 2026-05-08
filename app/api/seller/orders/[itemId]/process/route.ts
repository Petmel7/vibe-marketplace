import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { markAsProcessing } from '@/features/seller/orders/seller-order.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * POST /api/seller/orders/[itemId]/process
 * Transitions a PENDING order item to PROCESSING.
 * Requires the parent order to have status "confirmed".
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { itemId } = await params
    const data = await markAsProcessing(user, itemId)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('POST /api/seller/orders/[itemId]/process', err)
  }
}
