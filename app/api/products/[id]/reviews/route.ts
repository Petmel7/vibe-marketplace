import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { productIdParamSchema } from '@/features/products/product.schema'
import { createReview, listReviews } from '@/features/review/review.service'
import { reviewCreateSchema, reviewListQuerySchema } from '@/features/review/review.schema'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'
import { assertRateLimit, rateLimitProfiles } from '@/lib/security/rate-limit'
import { requireAuth } from '@/lib/session/getSession'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  try {
    const { id } = productIdParamSchema.parse(await params)
    const query = reviewListQuerySchema.parse({
      page: request.nextUrl.searchParams.get('page') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
    })
    const data = await listReviews(id, query)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('GET /api/products/[id]/reviews', error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  try {
    const user = await requireAuth()
    assertRateLimit(request, rateLimitProfiles.reviews, { userId: user.id })
    const { id } = productIdParamSchema.parse(await params)
    const body = await request.json()
    const input = reviewCreateSchema.parse(body)
    const data = await createReview(user, id, input)

    return Response.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('POST /api/products/[id]/reviews', error)
  }
}
