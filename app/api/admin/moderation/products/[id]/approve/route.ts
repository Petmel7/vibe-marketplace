import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { approveProduct } from '@/features/moderation/product/product-moderation.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * POST /api/admin/moderation/products/[id]/approve
 *
 * Approves a pending product (admin only). Transitions PENDING_REVIEW → PUBLISHED.
 *
 * Responses:
 *   200  { success: true, data: ProductModerationDto }
 *   400  { success: false, error: { message, code: 'INVALID_MODERATION_TRANSITION' } }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   403  { success: false, error: { message, code: 'FORBIDDEN' } }
 *   404  { success: false, error: { message, code: 'PRODUCT_NOT_FOUND' } }
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const data = await approveProduct(user, id)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('POST /api/admin/moderation/products/[id]/approve', err)
  }
}
