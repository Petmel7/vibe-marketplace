import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { requireBuyer } from '@/lib/auth/guards'
import { getMyAddresses, addAddress } from '@/features/address/address.service'
import { createAddressSchema } from '@/features/address/address.schema'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function GET(): Promise<Response> {
  try {
    const user = await requireAuth()
    const data = await getMyAddresses(user)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/profile/addresses', err)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    requireBuyer(user)
    const parsed = createAddressSchema.safeParse(await request.json())
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
    const data = await addAddress(user, parsed.data)
    return Response.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return toErrorResponse('POST /api/profile/addresses', err)
  }
}
