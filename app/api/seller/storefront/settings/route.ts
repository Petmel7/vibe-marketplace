import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { requireSeller } from '@/lib/auth/guards'
import { updateStoreSettingsSchema } from '@/features/storefront/storefront.schema'
import { updateStoreSettings } from '@/features/storefront/storefront.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * PATCH /api/seller/storefront/settings
 * Updates the authenticated seller's primary storefront settings.
 */
export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    requireSeller(user)

    const body = await request.json()
    const parsed = updateStoreSettingsSchema.safeParse(body)
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

    const data = await updateStoreSettings(user, parsed.data)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('PATCH /api/seller/storefront/settings', err)
  }
}
