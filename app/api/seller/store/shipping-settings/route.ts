import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { toErrorResponse } from '@/lib/errors/handleError'
import { updateStoreShippingSettingsSchema } from '@/features/shipping/shipping.schema'
import {
  getMyStoreShippingSettings,
  updateMyStoreShippingSettings,
} from '@/features/shipping/shipping.service'

export async function GET(): Promise<Response> {
  try {
    const user = await requireAuth()
    const data = await getMyStoreShippingSettings(user)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/seller/store/shipping-settings', err)
  }
}

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const parsed = updateStoreShippingSettingsSchema.safeParse(body)

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

    const data = await updateMyStoreShippingSettings(user, parsed.data)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('PATCH /api/seller/store/shipping-settings', err)
  }
}
