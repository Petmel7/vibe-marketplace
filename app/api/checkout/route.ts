import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { checkoutPreviewSchema, checkoutSchema } from '@/features/checkout/checkout.schema'
import { checkout, getCheckoutPreview } from '@/features/checkout/checkout.service'
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
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const parsed = checkoutPreviewSchema.safeParse({
      cartId: request.nextUrl.searchParams.get('cartId') ?? undefined,
      deliveryType: request.nextUrl.searchParams.get('deliveryType') ?? undefined,
      recipientName: request.nextUrl.searchParams.get('recipientName') ?? undefined,
      recipientPhone: request.nextUrl.searchParams.get('recipientPhone') ?? undefined,
      recipientCityRef: request.nextUrl.searchParams.get('recipientCityRef') ?? undefined,
      recipientCityName: request.nextUrl.searchParams.get('recipientCityName') ?? undefined,
      recipientWarehouseRef: request.nextUrl.searchParams.get('recipientWarehouseRef') ?? undefined,
      recipientWarehouseName:
        request.nextUrl.searchParams.get('recipientWarehouseName') ?? undefined,
    })

    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 },
      )
    }

    const data = await getCheckoutPreview(user, parsed.data)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/checkout', err)
  }
}

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
