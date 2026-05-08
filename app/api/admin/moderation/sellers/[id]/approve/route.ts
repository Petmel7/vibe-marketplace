import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { approveSeller } from '@/features/moderation/seller/seller-moderation.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * POST /api/admin/moderation/sellers/[id]/approve
 *
 * Approves a pending seller (admin only). Transitions PENDING → VERIFIED.
 *
 * Responses:
 *   200  { success: true, data: SellerModerationDto }
 *   400  { success: false, error: { message, code: 'INVALID_MODERATION_TRANSITION' } }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   403  { success: false, error: { message, code: 'FORBIDDEN' } }
 *   404  { success: false, error: { message, code: 'SELLER_NOT_FOUND' } }
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const data = await approveSeller(user, id)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('POST /api/admin/moderation/sellers/[id]/approve', err)
  }
}
