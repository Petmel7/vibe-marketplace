import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { initiateSelling } from '@/features/seller/seller.service'
import { sellerOnboardingSchema } from '@/features/seller/seller.schema'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const parsed = sellerOnboardingSchema.safeParse(await request.json())
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
    const data = await initiateSelling(user, parsed.data)
    return Response.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return toErrorResponse('POST /api/profile/seller/onboard', err)
  }
}
