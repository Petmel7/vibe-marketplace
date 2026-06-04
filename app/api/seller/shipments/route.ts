import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { toErrorResponse } from '@/lib/errors/handleError'
import { sellerShipmentListQuerySchema } from '@/features/shipping/shipping.schema'
import { getMyShipments } from '@/features/shipping/shipping.service'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const parsed = sellerShipmentListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    )

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

    const data = await getMyShipments(user, parsed.data)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/seller/shipments', err)
  }
}
