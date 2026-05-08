import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { productOversightFilterSchema } from '@/features/admin/oversight/admin-oversight.schema'
import { getAllProducts } from '@/features/admin/oversight/admin-oversight.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * GET /api/admin/products
 *
 * Returns all products with store and moderation info (admin only), paginated.
 *
 * Query params: page, limit, status, search
 *
 * Responses:
 *   200  { success: true, data: { items: AdminProductDto[], total, page, limit } }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   403  { success: false, error: { message, code: 'FORBIDDEN' } }
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const parsed = productOversightFilterSchema.safeParse(Object.fromEntries(searchParams.entries()))
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: { message: 'Validation error', code: 'VALIDATION_ERROR' },
        },
        { status: 400 },
      )
    }
    const data = await getAllProducts(user, parsed.data)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/admin/products', err)
  }
}
