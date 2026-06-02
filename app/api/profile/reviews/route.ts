import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { getMyReviews } from '@/features/review/review.service'
import { reviewListQuerySchema } from '@/features/review/review.schema'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const params = Object.fromEntries(request.nextUrl.searchParams.entries())
    const query = reviewListQuerySchema.parse(params)
    const data = await getMyReviews(user, query)

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

    return toErrorResponse('GET /api/profile/reviews', error)
  }
}
