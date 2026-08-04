import { type NextRequest } from 'next/server'
import { publicHeroBannerQuerySchema } from '@/features/hero/hero.schema'
import { getPublicHeroBanners } from '@/features/hero/hero.service'
import { handleApiRoute } from '@/lib/http/route'

export async function GET(request: NextRequest): Promise<Response> {
  return handleApiRoute('GET /api/hero-banners', async () => {
    const query = publicHeroBannerQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    )
    return getPublicHeroBanners(query)
  })
}
