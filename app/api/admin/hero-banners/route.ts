import { type NextRequest } from 'next/server'
import {
  createHeroBannerSchema,
  heroBannerQuerySchema,
} from '@/features/hero/hero.schema'
import {
  createAdminHeroBanner,
  getAdminHeroBanners,
} from '@/features/hero/hero.service'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { handleApiRoute } from '@/lib/http/route'
import { getRequestId } from '@/lib/security/request'
import { requireAuth } from '@/lib/session/getSession'

export async function GET(request: NextRequest): Promise<Response> {
  return handleApiRoute('GET /api/admin/hero-banners', async () => {
    const user = await requireAuth()
    const query = heroBannerQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    )
    return getAdminHeroBanners(user, query)
  })
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleApiRoute('POST /api/admin/hero-banners', async () => {
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

    return data
  }, { status: 201 })
}
