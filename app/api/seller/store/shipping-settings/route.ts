import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { toErrorResponse } from '@/lib/errors/handleError'
import { updateStoreShippingSettingsSchema } from '@/features/shipping/shipping.schema'
import { sellerStoreContextQuerySchema } from '@/features/store/store.schema'
import {
  getMyStoreShippingSettings,
  updateMyStoreShippingSettings,
} from '@/features/shipping/shipping.service'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const query = sellerStoreContextQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    )

    if (!query.success) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: query.error.flatten(),
          },
        },
        { status: 400 },
      )
    }

    const data = await getMyStoreShippingSettings(user, query.data.storeId)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/seller/store/shipping-settings', err)
  }
}

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const query = sellerStoreContextQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    )
    if (!query.success) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: query.error.flatten(),
          },
        },
        { status: 400 },
      )
    }
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

    const data = await updateMyStoreShippingSettings(user, parsed.data, query.data.storeId)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('PATCH /api/seller/store/shipping-settings', err)
  }
}
