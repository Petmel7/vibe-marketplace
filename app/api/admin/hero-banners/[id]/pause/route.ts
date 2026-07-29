import { type NextRequest } from 'next/server'
import { pauseAdminHeroBanner } from '@/features/hero/hero.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { toErrorResponse } from '@/lib/errors/handleError'
import { getRequestId } from '@/lib/security/request'
import { requireAuth } from '@/lib/session/getSession'

type Props = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const data = await pauseAdminHeroBanner(user, id)
    await recordAdminAudit({
      actorId: user.id,
      action: 'pause',
      domain: 'hero-banners',
      targetId: id,
      targetType: 'hero-banner',
      requestId: getRequestId(request),
    })

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return toErrorResponse('PATCH /api/admin/hero-banners/[id]/pause', error)
  }
}
