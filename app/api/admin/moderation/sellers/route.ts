import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { z } from 'zod'
import { getPendingSellerQueue } from '@/features/moderation/seller/seller-moderation.service'
import { toErrorResponse } from '@/lib/errors/handleError'

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * GET /api/admin/moderation/sellers
 *
 * Returns the queue of sellers pending approval (admin only).
 *
 * Query params: page, limit
 *
 * Responses:
 *   200  { success: true, data: SellerModerationQueueDto }
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
    const data = await getPendingSellerQueue(user, parsed.data)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/admin/moderation/sellers', err)
  }
}
