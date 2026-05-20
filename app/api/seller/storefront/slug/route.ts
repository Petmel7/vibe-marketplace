import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { requireSeller } from '@/lib/auth/guards'
import { slugCandidateSchema } from '@/features/storefront/storefront.schema'
import { checkSlugAvailability } from '@/features/storefront/storefront.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * GET /api/seller/storefront/slug?slug=<value>
 * Checks whether a slug is available and returns a suggestion if not.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    requireSeller(user)

    const slug = request.nextUrl.searchParams.get('slug') ?? ''
    const parsed = slugCandidateSchema.safeParse(slug)
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      )
    }

    const data = await checkSlugAvailability(parsed.data)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/seller/storefront/slug', err)
  }
}
