import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { getPendingProductQueue } from '@/features/moderation/product/product-moderation.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { paginationQuerySchema } from '@/lib/validation/query'

const paginationSchema = paginationQuerySchema()

/**
 * GET /api/admin/moderation/products
 *
 * Returns the queue of products pending approval (admin only).
 *
 * Query params: page, limit
 *
 * Responses:
 *   200  { success: true, data: ProductModerationQueueDto }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   403  { success: false, error: { message, code: 'FORBIDDEN' } }
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const parsed = paginationSchema.safeParse(Object.fromEntries(searchParams.entries()))
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: { message: 'Validation error', code: 'VALIDATION_ERROR' },
        },
        { status: 400 },
      )
    }
    const data = await getPendingProductQueue(user, parsed.data)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/admin/moderation/products', err)
  }
}
