import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { checkoutSchema } from '@/features/checkout/checkout.schema'
import { checkout } from '@/features/checkout/checkout.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * POST /api/checkout
 *
 * Converts a cart into an order.
 *
 * Responses:
 *   201  { success: true, data: CheckoutResponseDto }
 *   400  { success: false, error: { message, code } }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   403  { success: false, error: { message, code: 'FORBIDDEN' } }
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const parsed = checkoutSchema.safeParse(body)
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
    const data = await checkout(user, parsed.data)
    return Response.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return toErrorResponse('POST /api/checkout', err)
  }
}
