import { type NextRequest } from 'next/server'
import { reorderHeroBannersSchema } from '@/features/hero/hero.schema'
import { reorderAdminHeroBanners } from '@/features/hero/hero.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { handleApiRoute } from '@/lib/http/route'
import { getRequestId } from '@/lib/security/request'
import { requireAuth } from '@/lib/session/getSession'

export async function PATCH(request: NextRequest): Promise<Response> {
  return handleApiRoute('PATCH /api/admin/hero-banners/reorder', async () => {
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

    return data
  })
}
