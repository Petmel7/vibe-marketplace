import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { productSearchQuerySchema } from '@/features/products/product.schema'
import { searchProducts } from '@/features/products/product.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * GET /api/products/search
 *
 * Query params:
 *   q         - optional full-text search string (max 100 chars)
 *   category  - optional category slug; includes descendant categories
 *   minPrice  - optional minimum product price
 *   maxPrice  - optional maximum product price
 *   inStock   - optional inventory availability filter
 *   rating    - optional minimum rating threshold
 *   badge     - optional active marketplace badge filter
 *   store     - optional store slug or UUID
 *   sort      - relevance | newest | price_asc | price_desc | rating | popular
 *   page      - integer >= 1 (default: 1)
 *   limit     - integer 1-100 (default: 12)
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams

    const rawQuery = {
      q: searchParams.get('q') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      minPrice: searchParams.get('minPrice') ?? undefined,
      maxPrice: searchParams.get('maxPrice') ?? undefined,
      inStock: searchParams.get('inStock') ?? undefined,
      rating: searchParams.get('rating') ?? undefined,
      badge: searchParams.get('badge') ?? undefined,
      store: searchParams.get('store') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
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
            message: error.issues.map((issue) => issue.message).join('; '),
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 },
      )
    }

    return toErrorResponse('GET /api/products/search', error)
  }
}
