import { requireAuth } from '@/lib/session/getSession'
import { toErrorResponse } from '@/lib/errors/handleError'
import { bulkCreateShipmentTtnSchema } from '@/features/shipping/shipping.schema'
import { bulkCreateMyShipmentTtns } from '@/features/shipping/shipping.service'

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const parsed = bulkCreateShipmentTtnSchema.safeParse(body)

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

    const data = await bulkCreateMyShipmentTtns(user, parsed.data.shipmentIds)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('POST /api/seller/shipments/bulk-create-ttn', err)
  }
}
