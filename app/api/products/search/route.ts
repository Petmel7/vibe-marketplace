import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { productSearchQuerySchema } from '@/features/products/product.schema'
import { searchProducts } from '@/features/products/product.service'

/**
 * GET /api/products/search
 *
 * Query params:
 *   q      — required, full-text search string (max 100 chars)
 *   page   — integer ≥ 1 (default: 1)
 *   limit  — integer 1–100 (default: 20)
 *
 * Results are ranked by ts_rank descending (best match first).
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
      q: searchParams.get('q') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    }

    const query = productSearchQuerySchema.parse(rawQuery)

    const data = await searchProducts(query)

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

    console.error('[GET /api/products/search] Unexpected error:', error)

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
