import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { requireSeller } from '@/lib/auth/guards'
import { createStoreSchema } from '@/features/storefront/storefront.schema'
import { provisionStorefront } from '@/features/storefront/storefront.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * POST /api/seller/storefront/provision
 * Provisions a new storefront for a verified seller.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    requireSeller(user)

    const body = await request.json()
    const parsed = createStoreSchema.safeParse(body)
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

    const data = await provisionStorefront(user, parsed.data)
    return Response.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return toErrorResponse('POST /api/seller/storefront/provision', err)
  }
}
