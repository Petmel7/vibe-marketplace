import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { updateHeroBannerSchema } from '@/features/hero/hero.schema'
import {
  deleteAdminHeroBanner,
  getAdminHeroBanner,
  updateAdminHeroBanner,
} from '@/features/hero/hero.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'
import { getRequestId } from '@/lib/security/request'
import { requireAuth } from '@/lib/session/getSession'

type Props = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const data = await getAdminHeroBanner(user, id)
    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return toErrorResponse('GET /api/admin/hero-banners/[id]', error)
  }
}

export async function PATCH(request: NextRequest, { params }: Props): Promise<Response> {
  try {
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

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('PATCH /api/admin/hero-banners/[id]', error)
  }
}

export async function DELETE(request: NextRequest, { params }: Props): Promise<Response> {
  try {
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

    return Response.json({ success: true, data: null }, { status: 200 })
  } catch (error) {
    return toErrorResponse('DELETE /api/admin/hero-banners/[id]', error)
  }
}
