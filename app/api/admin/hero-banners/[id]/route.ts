import { type NextRequest } from 'next/server'
import { updateHeroBannerSchema } from '@/features/hero/hero.schema'
import {
  deleteAdminHeroBanner,
  getAdminHeroBanner,
  updateAdminHeroBanner,
} from '@/features/hero/hero.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { handleApiRoute } from '@/lib/http/route'
import { getRequestId } from '@/lib/security/request'
import { requireAuth } from '@/lib/session/getSession'

type Props = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: Props): Promise<Response> {
  return handleApiRoute('GET /api/admin/hero-banners/[id]', async () => {
    const user = await requireAuth()
    const { id } = await params
    return getAdminHeroBanner(user, id)
  })
}

export async function PATCH(request: NextRequest, { params }: Props): Promise<Response> {
  return handleApiRoute('PATCH /api/admin/hero-banners/[id]', async () => {
    const user = await requireAuth()
    const { id } = await params
    const body = updateHeroBannerSchema.parse(await request.json())
    const data = await updateAdminHeroBanner(user, id, body)
    await recordAdminAudit({
      actorId: user.id,
      action: 'update',
      domain: 'hero-banners',
      targetId: id,
      targetType: 'hero-banner',
      metadata: body,
      requestId: getRequestId(request),
    })

    return data
  })
}

export async function DELETE(request: NextRequest, { params }: Props): Promise<Response> {
  return handleApiRoute('DELETE /api/admin/hero-banners/[id]', async () => {
    const user = await requireAuth()
    const { id } = await params
    await deleteAdminHeroBanner(user, id)
    await recordAdminAudit({
      actorId: user.id,
      action: 'delete',
      domain: 'hero-banners',
      targetId: id,
      targetType: 'hero-banner',
      requestId: getRequestId(request),
    })

    return null
  })
}
