import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { productPaginationQuerySchema } from '@/features/products/product.schema'
import { listHitProducts } from '@/features/products/product.service'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams

    const query = productPaginationQuerySchema.parse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })

    const data = await listHitProducts(query)

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
        { status: 400 },
      )
    }

    console.error('[GET /api/products/hit] Unexpected error:', error)

    return Response.json(
      {
        success: false,
        error: {
          message: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 },
    )
  }
}
