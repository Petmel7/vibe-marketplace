import { requireAuth } from '@/lib/session/getSession'
import { requireAdmin } from '@/lib/auth/guards'
import { toErrorResponse } from '@/lib/errors/handleError'
import { shipmentSyncSchema } from '@/features/shipping/shipping.schema'
import { syncPendingShipments, syncShipmentStatus } from '@/features/shipping/shipping.service'

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth()
    requireAdmin(user)

    const body = await request.json().catch(() => ({}))
    const parsed = shipmentSyncSchema.safeParse(body)

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

    const data = parsed.data.shipmentId
      ? { results: [await syncShipmentStatus(parsed.data.shipmentId)] }
      : await syncPendingShipments(parsed.data.limit)

    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('POST /api/admin/shipments/sync', err)
  }
}
