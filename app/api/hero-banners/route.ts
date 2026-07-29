import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { publicHeroBannerQuerySchema } from '@/features/hero/hero.schema'
import { getPublicHeroBanners } from '@/features/hero/hero.service'
import { toErrorResponse } from '@/lib/errors/handleError'
import { validationErrorResponse } from '@/lib/http/validation'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const query = publicHeroBannerQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    )
    const data = await getPublicHeroBanners(query)
    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }

    return toErrorResponse('GET /api/hero-banners', error)
  }
}
