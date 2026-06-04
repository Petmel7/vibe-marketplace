import { type NextRequest } from 'next/server'
import { toErrorResponse } from '@/lib/errors/handleError'
import { novaPoshtaCitiesQuerySchema } from '@/features/shipping/shipping.schema'
import { searchNovaPoshtaCities } from '@/features/shipping/shipping.service'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const parsed = novaPoshtaCitiesQuerySchema.safeParse({
      q: request.nextUrl.searchParams.get('q') ?? undefined,
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

    const data = await searchNovaPoshtaCities(parsed.data.q)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/shipping/nova-poshta/cities', err)
  }
}
