import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { updateSeoMetadataSchema } from '@/features/seo/seo.schema'
import {
  deleteAdminSeoMetadata,
  getAdminSeoMetadataById,
  updateAdminSeoMetadata,
} from '@/features/seo/seo.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'
import { getRequestId } from '@/lib/security/request'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const data = await getAdminSeoMetadataById(user, id)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return toErrorResponse('GET /api/admin/seo/[id]', error)
  }
}

export async function PATCH(request: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = updateSeoMetadataSchema.parse(await request.json())
    const { id } = await params
    const data = await updateAdminSeoMetadata(user, id, body)
    await recordAdminAudit({
      actorId: user.id,
      action: 'update',
      domain: 'seo',
      targetId: id,
      targetType: 'seo-metadata',
      metadata: body,
      requestId: getRequestId(request),
    })

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('PATCH /api/admin/seo/[id]', error)
  }
}

export async function DELETE(request: Request, { params }: Props): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    await deleteAdminSeoMetadata(user, id)
    await recordAdminAudit({
      actorId: user.id,
      action: 'delete',
      domain: 'seo',
      targetId: id,
      targetType: 'seo-metadata',
      requestId: getRequestId(request),
    })

    return Response.json({ success: true, data: null }, { status: 200 })
  } catch (error) {
    return toErrorResponse('DELETE /api/admin/seo/[id]', error)
  }
}

