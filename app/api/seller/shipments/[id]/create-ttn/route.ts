import { requireAuth } from '@/lib/session/getSession'
import { toErrorResponse } from '@/lib/errors/handleError'
import { shipmentIdParamsSchema } from '@/features/shipping/shipping.schema'
import { createMyShipmentTtn } from '@/features/shipping/shipping.service'

export async function POST(
  _: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const params = await context.params
    const parsed = shipmentIdParamsSchema.safeParse(params)

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

    const data = await createMyShipmentTtn(user, parsed.data.id)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('POST /api/seller/shipments/[id]/create-ttn', err)
  }
}
