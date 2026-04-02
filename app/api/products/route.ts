import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { productListQuerySchema } from '@/features/products/product.schema'
import { listProducts } from '@/features/products/product.service'

/**
 * GET /api/products
 *
 * Query params (all optional):
 *   storeId  — UUID, filter by store
 *   search   — string (max 100), full-text search
 *   page     — integer ≥ 1 (default: 1)
 *   limit    — integer 1–100 (default: 20)
 *
 * Responses:
 *   200  { success: true,  data: ProductListDto }
 *   400  { success: false, error: { message, code: 'VALIDATION_ERROR' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams

    const rawQuery = {
      storeId: searchParams.get('storeId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    }

    const query = productListQuerySchema.parse(rawQuery)

    const data = await listProducts(query)

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

    console.error('[GET /api/products] Unexpected error:', error)

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
