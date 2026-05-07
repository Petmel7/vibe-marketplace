import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { setDefaultAddress } from '@/features/address/address.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth()
    const { id } = await params
    await setDefaultAddress(user, id)
    return Response.json({ success: true, data: null })
  } catch (err) {
    return toErrorResponse('POST /api/profile/addresses/[id]/default', err)
  }
}
