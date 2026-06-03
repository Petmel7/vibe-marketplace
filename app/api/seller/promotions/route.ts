import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import {
  createSellerPromotionSchema,
  promotionQuerySchema,
} from '@/features/promotions/promotions.schema'
import {
  createSellerPromotion,
  getSellerPromotions,
} from '@/features/promotions/promotions.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const query = promotionQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    )
    const data = await getSellerPromotions(user, query)

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

    return toErrorResponse('GET /api/seller/promotions', error)
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = createSellerPromotionSchema.parse(await request.json())
    const data = await createSellerPromotion(user, body)

    return Response.json({ success: true, data }, { status: 201 })
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

    return toErrorResponse('POST /api/seller/promotions', error)
  }
}
