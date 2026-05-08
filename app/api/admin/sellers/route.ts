import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { sellerOversightFilterSchema } from '@/features/admin/oversight/admin-oversight.schema'
import { getAllSellers } from '@/features/admin/oversight/admin-oversight.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * GET /api/admin/sellers
 *
 * Returns all sellers with store counts and verification status (admin only), paginated.
 *
 * Query params: page, limit, status
 *
 * Responses:
 *   200  { success: true, data: { items: AdminSellerDto[], total, page, limit } }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   403  { success: false, error: { message, code: 'FORBIDDEN' } }
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const parsed = sellerOversightFilterSchema.safeParse(Object.fromEntries(searchParams.entries()))
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: { message: 'Validation error', code: 'VALIDATION_ERROR' },
        },
        { status: 400 },
      )
    }
    const data = await getAllSellers(user, parsed.data)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/admin/sellers', err)
  }
}
