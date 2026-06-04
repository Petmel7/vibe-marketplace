import { type NextRequest } from 'next/server'
import { toErrorResponse } from '@/lib/errors/handleError'
import { novaPoshtaWarehousesQuerySchema } from '@/features/shipping/shipping.schema'
import { getNovaPoshtaWarehouses } from '@/features/shipping/shipping.service'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const parsed = novaPoshtaWarehousesQuerySchema.safeParse({
      cityRef: request.nextUrl.searchParams.get('cityRef') ?? undefined,
    })

    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 },
      )
    }

    const data = await getNovaPoshtaWarehouses(parsed.data.cityRef)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/shipping/nova-poshta/warehouses', err)
  }
}
