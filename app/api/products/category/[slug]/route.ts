import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import {
  productCategoryPaginationQuerySchema,
  productCategorySlugParamSchema,
} from '@/features/products/product.schema'
import { listProductsByCategorySlug } from '@/features/products/product.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams
    const { slug } = await params

    const validatedParams = productCategorySlugParamSchema.parse({ slug })
    const query = productCategoryPaginationQuerySchema.parse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })

    const data = await listProductsByCategorySlug(validatedParams.slug, query)

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

    console.error('[GET /api/products/category/[slug]] Unexpected error:', error)

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
