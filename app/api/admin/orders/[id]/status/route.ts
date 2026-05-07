import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { updateOrderStatusSchema } from '@/features/orders/orders.schema'
import { updateStatus } from '@/features/orders/orders.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * PATCH /api/admin/orders/[id]/status
 *
 * Updates the status of an order (admin only).
 *
 * Body: { status: OrderStatus }
 *
 * Responses:
 *   200  { success: true, data: OrderDetailDto }
 *   400  { success: false, error: { message, code } }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   403  { success: false, error: { message, code: 'FORBIDDEN' } }
 *   404  { success: false, error: { message, code: 'ORDER_NOT_FOUND' } }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const parsed = updateOrderStatusSchema.safeParse(body)
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
    const data = await updateStatus(user, id, parsed.data.status)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('PATCH /api/admin/orders/[id]/status', err)
  }
}
