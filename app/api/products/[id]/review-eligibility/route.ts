import { ZodError } from 'zod'
import { productIdParamSchema } from '@/features/products/product.schema'
import { getReviewEligibility } from '@/features/review/review.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { getCurrentUser } from '@/lib/session/getSession'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<Response> {
  try {
    const { id } = productIdParamSchema.parse(await params)
    const user = await getCurrentUser()
    const data = await getReviewEligibility(user, id)

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

    return toErrorResponse('GET /api/products/[id]/review-eligibility', error)
  }
}
