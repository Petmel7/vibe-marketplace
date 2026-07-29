import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import {
  createHeroBannerSchema,
  heroBannerQuerySchema,
} from '@/features/hero/hero.schema'
import {
  createAdminHeroBanner,
  getAdminHeroBanners,
} from '@/features/hero/hero.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'
import { getRequestId } from '@/lib/security/request'
import { requireAuth } from '@/lib/session/getSession'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const query = heroBannerQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    )
    const data = await getAdminHeroBanners(user, query)
    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('GET /api/admin/hero-banners', error)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = createHeroBannerSchema.parse(await request.json())
    const data = await createAdminHeroBanner(user, body)
    await recordAdminAudit({
      actorId: user.id,
      action: 'create',
      domain: 'hero-banners',
      targetId: data.id,
      targetType: 'hero-banner',
      metadata: body,
      requestId: getRequestId(request),
    })

    return Response.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('POST /api/admin/hero-banners', error)
  }
}
