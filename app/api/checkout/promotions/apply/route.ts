import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { applyCheckoutPromotionSchema } from '@/features/promotions/promotions.schema'
import { applyCheckoutPromotion } from '@/features/checkout/checkout.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = applyCheckoutPromotionSchema.parse(await request.json())
    const data = await applyCheckoutPromotion(user, body)

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

    return toErrorResponse('POST /api/checkout/promotions/apply', error)
  }
}
