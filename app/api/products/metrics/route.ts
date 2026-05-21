import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { getProductMetrics } from '@/features/products/product-badge.service'
import { productMetricsQuerySchema } from '@/features/products/product-badge.schema'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams

    const query = productMetricsQuerySchema.parse({
      productId: searchParams.get('productId') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })

    const data = await getProductMetrics(query)
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

    return toErrorResponse('GET /api/products/metrics', error)
  }
}
