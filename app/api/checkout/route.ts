import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { checkoutPreviewSchema, checkoutSchema } from '@/features/checkout/checkout.schema'
import { checkout, getCheckoutPreview } from '@/features/checkout/checkout.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { assertRateLimit, rateLimitProfiles } from '@/lib/security/rate-limit'
import { validationErrorResponse } from '@/lib/http/validation'

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
    assertRateLimit(request, rateLimitProfiles.checkout, { userId: user.id })
    const parsed = checkoutPreviewSchema.safeParse({
      cartId: request.nextUrl.searchParams.get('cartId') ?? undefined,
      deliveryType: request.nextUrl.searchParams.get('deliveryType') ?? undefined,
      recipientName: request.nextUrl.searchParams.get('recipientName') ?? undefined,
      recipientFirstName:
        request.nextUrl.searchParams.get('recipientFirstName') ?? undefined,
      recipientLastName:
        request.nextUrl.searchParams.get('recipientLastName') ?? undefined,
      recipientMiddleName:
        request.nextUrl.searchParams.get('recipientMiddleName') ?? undefined,
      recipientPhone: request.nextUrl.searchParams.get('recipientPhone') ?? undefined,
      recipientCityRef: request.nextUrl.searchParams.get('recipientCityRef') ?? undefined,
      recipientCityName: request.nextUrl.searchParams.get('recipientCityName') ?? undefined,
      recipientStreet: request.nextUrl.searchParams.get('recipientStreet') ?? undefined,
      recipientBuilding: request.nextUrl.searchParams.get('recipientBuilding') ?? undefined,
      recipientApartment: request.nextUrl.searchParams.get('recipientApartment') ?? undefined,
      recipientWarehouseRef: request.nextUrl.searchParams.get('recipientWarehouseRef') ?? undefined,
      recipientWarehouseName:
        request.nextUrl.searchParams.get('recipientWarehouseName') ?? undefined,
    })

    if (!parsed.success) {
      return validationErrorResponse(parsed.error)
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
    assertRateLimit(request, rateLimitProfiles.checkout, { userId: user.id })
    const body = await request.json()
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error)
    }
    const data = await checkout(user, parsed.data)
    return Response.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return toErrorResponse('POST /api/checkout', err)
  }
}
