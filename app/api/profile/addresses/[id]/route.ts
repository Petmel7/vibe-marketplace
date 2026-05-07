import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { updateMyAddress, deleteMyAddress } from '@/features/address/address.service'
import { updateAddressSchema } from '@/features/address/address.schema'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    const parsed = updateAddressSchema.safeParse(await request.json())
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
    const data = await updateMyAddress(user, id, parsed.data)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('PATCH /api/profile/addresses/[id]', err)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    await deleteMyAddress(user, id)
    return Response.json({ success: true, data: null })
  } catch (err) {
    return toErrorResponse('DELETE /api/profile/addresses/[id]', err)
  }
}
