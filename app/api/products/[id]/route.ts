import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { productIdParamSchema } from '@/features/products/product.schema'
import {
  getProduct,
  ProductNotFoundError,
} from '@/features/products/product.service'

/**
 * GET /api/products/[id]
 *
 * Path param:
 *   id — UUID of the product
 *
 * Responses:
 *   200  { success: true,  data: ProductDetailDto }
 *   400  { success: false, error: { message, code: 'VALIDATION_ERROR' } }
 *   404  { success: false, error: { message, code: 'NOT_FOUND' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    // In Next.js 16 (App Router) dynamic route params are a Promise.
    const { id } = await params

    const validated = productIdParamSchema.parse({ id })

    const data = await getProduct(validated.id)

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

    if (error instanceof ProductNotFoundError) {
      return Response.json(
        {
          success: false,
          error: {
            message: error.message,
            code: error.code,
          },
        },
        { status: 404 }
      )
    }

    console.error('[GET /api/products/[id]] Unexpected error:', error)

    return Response.json(
      {
        success: false,
        error: {
          message: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    )
  }
}
