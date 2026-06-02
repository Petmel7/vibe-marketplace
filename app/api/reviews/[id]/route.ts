import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { deleteMyReview, updateMyReview } from '@/features/review/review.service'
import { reviewIdParamSchema, reviewUpdateSchema } from '@/features/review/review.schema'
import { toErrorResponse } from '@/lib/errors/handleError'
import { requireAuth } from '@/lib/session/getSession'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = reviewIdParamSchema.parse(await params)
    const body = await request.json()
    const input = reviewUpdateSchema.parse(body)
    const data = await updateMyReview(user, id, input)

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

    return toErrorResponse('PATCH /api/reviews/[id]', error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = reviewIdParamSchema.parse(await params)
    const data = await deleteMyReview(user, id)

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

    return toErrorResponse('DELETE /api/reviews/[id]', error)
  }
}
