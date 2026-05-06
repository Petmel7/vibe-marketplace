import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { verifyBearerToken } from '@/lib/auth'
import { logError } from '@/utils/logger'
import { productIdParamSchema } from '@/features/products/product.schema'
import { reviewCreateSchema, reviewListQuerySchema } from '@/features/review/review.schema'
import {
  listReviews,
  createReview,
  ProductNotFoundError,
  ReviewAlreadyExistsError,
} from '@/features/review/review.service'

type RouteContext = { params: Promise<{ id: string }> }

// ---------------------------------------------------------------------------
// GET /api/products/[id]/reviews
// ---------------------------------------------------------------------------

/**
 * GET /api/products/[id]/reviews
 *
 * List reviews for a product. Public — no authentication required.
 *
 * Query params (all optional):
 *   page   — integer ≥ 1 (default: 1)
 *   limit  — integer 1–100 (default: 20)
 *
 * Responses:
 *   200  { success: true,  data: ReviewListDto }
 *   400  { success: false, error: { message, code: 'VALIDATION_ERROR' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  try {
    const { id: productId } = productIdParamSchema.parse(await params)

    const searchParams = request.nextUrl.searchParams
    const query = reviewListQuerySchema.parse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })

    const data = await listReviews(productId, query)
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

    logError('GET /api/products/[id]/reviews', error)
    return Response.json(
      { success: false, error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// POST /api/products/[id]/reviews
// ---------------------------------------------------------------------------

/**
 * POST /api/products/[id]/reviews
 *
 * Submit a review for a product. Authenticated users only.
 *
 * Headers:
 *   Authorization: Bearer <token>  — Supabase access token (required)
 *
 * Body: { rating: number (1–5), comment?: string (max 2000 chars) }
 *
 * Responses:
 *   201  { success: true,  data: ReviewDto }
 *   400  { success: false, error: { message, code: 'VALIDATION_ERROR' } }
 *   401  { success: false, error: { message, code: 'UNAUTHORIZED' } }
 *   404  { success: false, error: { message, code: 'NOT_FOUND' } }
 *   409  { success: false, error: { message, code: 'REVIEW_ALREADY_EXISTS' } }
 *   500  { success: false, error: { message, code: 'INTERNAL_ERROR' } }
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  try {
    const auth = await verifyBearerToken(request)
    if (!auth.ok) return auth.response

    const { id: productId } = productIdParamSchema.parse(await params)

    const body = await request.json()
    const input = reviewCreateSchema.parse(body)

    const data = await createReview(productId, auth.userId, input)
    return Response.json({ success: true, data }, { status: 201 })
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

    if (error instanceof ProductNotFoundError) {
      return Response.json(
        { success: false, error: { message: error.message, code: error.code } },
        { status: 404 },
      )
    }

    if (error instanceof ReviewAlreadyExistsError) {
      return Response.json(
        { success: false, error: { message: error.message, code: error.code } },
        { status: 409 },
      )
    }

    logError('POST /api/products/[id]/reviews', error)
    return Response.json(
      { success: false, error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    )
  }
}
