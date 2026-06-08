import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import {
  createPromotionSchema,
  promotionQuerySchema,
} from '@/features/promotions/promotions.schema'
import {
  createAdminPromotion,
  getAdminPromotions,
} from '@/features/promotions/promotions.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'
import { getRequestId } from '@/lib/security/request'

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const query = promotionQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    )
    const data = await getAdminPromotions(user, query)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('GET /api/admin/promotions', error)
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = createPromotionSchema.parse(await request.json())
    const data = await createAdminPromotion(user, body)
    await recordAdminAudit({
      actorId: user.id,
      action: 'create',
      domain: 'promotions',
      targetId: data.id,
      targetType: 'promotion',
      metadata: {
        ownerType: data.ownerType,
        type: data.type,
        code: data.code,
        isActive: data.isActive,
      },
      requestId: getRequestId(request),
    })

    return Response.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('POST /api/admin/promotions', error)
  }
}
