import { type NextRequest } from 'next/server'
import { getCart, clearCart } from '@/features/cart/cart.service'
import {
  resolveCartIdentifier,
  identifierMissingResponse,
  internalErrorResponse,
} from '@/app/api/cart/_helpers'

/**
 * GET /api/cart
 *
 * Returns the current cart (or creates an empty one) for the caller.
 * Identifies the caller via headers:
 *   x-user-id     — UUID of an authenticated user
 *   x-session-id  — opaque string for guest sessions
 *
 * Responses:
 *   200  { success: true,  data: CartDto }
 *   400  { success: false, error: { message, code: 'MISSING_IDENTIFIER' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const identifier = resolveCartIdentifier(request)
    if (!identifier) return identifierMissingResponse()

    const data = await getCart(identifier)
    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return internalErrorResponse('GET /api/cart', error)
  }
}

/**
 * DELETE /api/cart
 *
 * Clears all items from the caller's cart and returns the empty cart.
 *
 * Responses:
 *   200  { success: true,  data: CartDto }
 *   400  { success: false, error: { message, code: 'MISSING_IDENTIFIER' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const identifier = resolveCartIdentifier(request)
    if (!identifier) return identifierMissingResponse()

    const data = await clearCart(identifier)
    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return internalErrorResponse('DELETE /api/cart', error)
  }
}
