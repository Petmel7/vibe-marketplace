import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { addCartItemSchema } from '@/features/cart/cart.schema'
import {
  addItem,
  VariantNotFoundError,
  InsufficientStockError,
} from '@/features/cart/cart.service'
import {
  resolveCartIdentifier,
  identifierMissingResponse,
  notFoundResponse,
  conflictResponse,
  internalErrorResponse,
} from '@/app/api/cart/_helpers'

/**
 * POST /api/cart/items
 *
 * Add a product variant to the cart (or increment quantity if already present).
 *
 * Body: { variantId: string (UUID), quantity: number (1–100) }
 *
 * Responses:
 *   200  { success: true,  data: CartDto }
 *   400  { success: false, error: { message, code: 'MISSING_IDENTIFIER' | 'VALIDATION_ERROR' } }
 *   404  { success: false, error: { message, code: 'NOT_FOUND' } }
 *   409  { success: false, error: { message, code: 'INSUFFICIENT_STOCK' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const identifier = resolveCartIdentifier(request)
    if (!identifier) return identifierMissingResponse()

    const body = await request.json()
    const input = addCartItemSchema.parse(body)

    const data = await addItem(identifier, input)
    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            message: error.issues.map((e) => e.message).join('; '),
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 }
      )
    }

    if (error instanceof VariantNotFoundError) {
      return notFoundResponse(error.message)
    }

    if (error instanceof InsufficientStockError) {
      return conflictResponse(error.message, error.code)
    }

    return internalErrorResponse('POST /api/cart/items', error)
  }
}
