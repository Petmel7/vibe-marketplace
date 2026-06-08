import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import { createSeoMetadataSchema, seoListQuerySchema } from '@/features/seo/seo.schema'
import { createAdminSeoMetadata, getAdminSeoMetadata } from '@/features/seo/seo.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'
import { getRequestId } from '@/lib/security/request'

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const query = seoListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    )
    const data = await getAdminSeoMetadata(user, query)

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('GET /api/admin/seo', error)
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = createSeoMetadataSchema.parse(await request.json())
    const data = await createAdminSeoMetadata(user, body)
    await recordAdminAudit({
      actorId: user.id,
      action: 'create',
      domain: 'seo',
      targetId: data.id,
      targetType: 'seo-metadata',
      metadata: {
        entityType: data.entityType,
        entityId: data.entityId,
        noIndex: data.noIndex,
        noFollow: data.noFollow,
      },
      requestId: getRequestId(request),
    })

    return Response.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('POST /api/admin/seo', error)
  }
}

