import { type NextRequest } from 'next/server'
import { getCart, clearCart } from '@/features/cart/cart.service'
import { resolveCartIdentifier } from '@/app/api/cart/_helpers'
import { handleApiRoute } from '@/lib/http/route'

/**
 * GET /api/cart
 *
 * Returns the current cart (or creates an empty one) for the caller.
 * Identifies the caller via:
 *   Authorization: Bearer <token>  — authenticated user (verified via Supabase)
 *   x-session-id                   — opaque string for guest sessions
 *
 * Responses:
 *   200  { success: true,  data: CartDto }
 *   400  { success: false, error: { message, code: 'MISSING_IDENTIFIER' } }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function GET(request: NextRequest): Promise<Response> {
  return handleApiRoute('GET /api/cart', async () => {
    const result = await resolveCartIdentifier(request)
    if (!result.ok) return result.response

    return getCart(result.identifier)
  })
}

/**
 * DELETE /api/cart
 *
 * Clears all items from the caller's cart and returns the empty cart.
 *
 * Responses:
 *   200  { success: true,  data: CartDto }
 *   400  { success: false, error: { message, code: 'MISSING_IDENTIFIER' } }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function DELETE(request: NextRequest): Promise<Response> {
  return handleApiRoute('DELETE /api/cart', async () => {
    const result = await resolveCartIdentifier(request)
    if (!result.ok) return result.response

    return clearCart(result.identifier)
  })
}
