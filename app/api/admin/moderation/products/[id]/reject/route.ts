import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { rejectProductSchema } from '@/features/moderation/product/product-moderation.schema'
import { rejectProduct } from '@/features/moderation/product/product-moderation.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * POST /api/admin/moderation/products/[id]/reject
 *
 * Rejects a pending product (admin only). Transitions PENDING_REVIEW → REJECTED.
 *
 * Body: { reason: string }
 *
 * Responses:
 *   200  { success: true, data: ProductModerationDto }
 *   400  { success: false, error: { message, code } }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   403  { success: false, error: { message, code: 'FORBIDDEN' } }
 *   404  { success: false, error: { message, code: 'PRODUCT_NOT_FOUND' } }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const parsed = rejectProductSchema.safeParse({ productId: id, ...body })
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: { message: 'Validation error', code: 'VALIDATION_ERROR' },
        },
        { status: 400 },
      )
    }
    const data = await rejectProduct(user, id, parsed.data.reason)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('POST /api/admin/moderation/products/[id]/reject', err)
  }
}
