import { type NextRequest } from 'next/server'
import { archiveAdminHeroBanner } from '@/features/hero/hero.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { handleApiRoute } from '@/lib/http/route'
import { getRequestId } from '@/lib/security/request'
import { requireAuth } from '@/lib/session/getSession'

type Props = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Props): Promise<Response> {
  return handleApiRoute('PATCH /api/admin/hero-banners/[id]/archive', async () => {
    const user = await requireAuth()
    const { id } = await params
    const data = await archiveAdminHeroBanner(user, id)
    await recordAdminAudit({
      actorId: user.id,
      action: 'archive',
      domain: 'hero-banners',
      targetId: id,
      targetType: 'hero-banner',
      requestId: getRequestId(request),
    })

    return data
  })
}
