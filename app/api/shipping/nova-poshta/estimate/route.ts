import { toErrorResponse } from '@/lib/errors/handleError'
import { estimateNovaPoshtaDelivery } from '@/features/shipping/shipping.service'
import { novaPoshtaEstimateSchema } from '@/features/shipping/shipping.schema'

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json()
    const parsed = novaPoshtaEstimateSchema.safeParse(body)

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

    const data = await estimateNovaPoshtaDelivery(parsed.data)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('POST /api/shipping/nova-poshta/estimate', err)
  }
}
