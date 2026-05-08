import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { rejectSellerSchema } from '@/features/moderation/seller/seller-moderation.schema'
import { rejectSeller } from '@/features/moderation/seller/seller-moderation.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * POST /api/admin/moderation/sellers/[id]/reject
 *
 * Rejects a pending seller (admin only). Transitions PENDING → REJECTED.
 *
 * Body: { reason: string (min 10 chars) }
 *
 * Responses:
 *   200  { success: true, data: SellerModerationDto }
 *   400  { success: false, error: { message, code } }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   403  { success: false, error: { message, code: 'FORBIDDEN' } }
 *   404  { success: false, error: { message, code: 'SELLER_NOT_FOUND' } }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const parsed = rejectSellerSchema.safeParse({ sellerId: id, ...body })
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: { message: 'Validation error', code: 'VALIDATION_ERROR' },
        },
        { status: 400 },
      )
    }
    const data = await rejectSeller(user, id, parsed.data.reason)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('POST /api/admin/moderation/sellers/[id]/reject', err)
  }
}
