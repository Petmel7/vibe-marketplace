import { requireAuth } from '@/lib/session/getSession'
import { requireSeller } from '@/lib/auth/guards'
import { getMySellerProfile } from '@/features/seller/seller.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function GET(): Promise<Response> {
  try {
    const user = await requireAuth()
    requireSeller(user)
    const data = await getMySellerProfile(user)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/profile/seller', err)
  }
}
