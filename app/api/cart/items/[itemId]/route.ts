import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import {
  cartItemIdParamSchema,
  updateCartItemSchema,
} from '@/features/cart/cart.schema'
import {
  updateItem,
  removeItem,
  CartItemNotFoundError,
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
 * PATCH /api/cart/items/[itemId]
 *
 * Set the absolute quantity of a cart line item.
 *
 * Body: { quantity: number (1–100) }
 *
 * Responses:
 *   200  { success: true,  data: CartDto }
 *   400  { success: false, error: { message, code: 'MISSING_IDENTIFIER' | 'VALIDATION_ERROR' } }
 *   404  { success: false, error: { message, code: 'NOT_FOUND' } }
 *   409  { success: false, error: { message, code: 'INSUFFICIENT_STOCK' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
): Promise<Response> {
  try {
    const identifier = resolveCartIdentifier(request)
    if (!identifier) return identifierMissingResponse()

    const { itemId } = cartItemIdParamSchema.parse(await params)

    const body = await request.json()
    const input = updateCartItemSchema.parse(body)

    const data = await updateItem(identifier, itemId, input)
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

    if (error instanceof CartItemNotFoundError) {
      return notFoundResponse(error.message)
    }

    if (error instanceof InsufficientStockError) {
      return conflictResponse(error.message, error.code)
    }

    return internalErrorResponse('PATCH /api/cart/items/[itemId]', error)
  }
}

/**
 * DELETE /api/cart/items/[itemId]
 *
 * Remove a single line item from the cart.
 *
 * Responses:
 *   200  { success: true,  data: CartDto }
 *   400  { success: false, error: { message, code: 'MISSING_IDENTIFIER' | 'VALIDATION_ERROR' } }
 *   404  { success: false, error: { message, code: 'NOT_FOUND' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
): Promise<Response> {
  try {
    const identifier = resolveCartIdentifier(request)
    if (!identifier) return identifierMissingResponse()

    const { itemId } = cartItemIdParamSchema.parse(await params)

    const data = await removeItem(identifier, itemId)
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

    if (error instanceof CartItemNotFoundError) {
      return notFoundResponse(error.message)
    }

    return internalErrorResponse('DELETE /api/cart/items/[itemId]', error)
  }
}
