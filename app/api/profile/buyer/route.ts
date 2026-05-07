import { requireAuth } from '@/lib/session/getSession'
import { requireBuyer } from '@/lib/auth/guards'
import { getMyBuyerProfile } from '@/features/buyer/buyer.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function GET(): Promise<Response> {
  try {
    const user = await requireAuth()
    requireBuyer(user)
    const data = await getMyBuyerProfile(user)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/profile/buyer', err)
  }
}
