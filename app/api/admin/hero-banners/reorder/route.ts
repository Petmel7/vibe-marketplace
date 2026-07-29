import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { reorderHeroBannersSchema } from '@/features/hero/hero.schema'
import { reorderAdminHeroBanners } from '@/features/hero/hero.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'
import { getRequestId } from '@/lib/security/request'
import { requireAuth } from '@/lib/session/getSession'

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = reorderHeroBannersSchema.parse(await request.json())
    const data = await reorderAdminHeroBanners(user, body)
    await recordAdminAudit({
      actorId: user.id,
      action: 'reorder',
      domain: 'hero-banners',
      targetType: 'hero-banner',
      metadata: body,
      requestId: getRequestId(request),
    })

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('PATCH /api/admin/hero-banners/reorder', error)
  }
}
