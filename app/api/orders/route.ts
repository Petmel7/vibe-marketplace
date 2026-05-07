import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { orderFilterSchema } from '@/features/orders/orders.schema'
import { getMyOrders } from '@/features/orders/orders.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * GET /api/orders
 *
 * Returns paginated orders for the authenticated buyer.
 *
 * Query params: status, page, limit
 *
 * Responses:
 *   200  { success: true, data: OrderSummaryDto[] }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   403  { success: false, error: { message, code: 'FORBIDDEN' } }
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const parsed = orderFilterSchema.safeParse(Object.fromEntries(searchParams.entries()))
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      )
    }
    const data = await getMyOrders(user, parsed.data)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/orders', err)
  }
}
