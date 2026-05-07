import { requireAuth } from '@/lib/session/getSession'
import { requireAdmin } from '@/lib/auth/guards'
import { getMyAdminProfile } from '@/features/admin/admin.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function GET(): Promise<Response> {
  try {
    const user = await requireAuth()
    requireAdmin(user)
    const data = await getMyAdminProfile(user)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/profile/admin', err)
  }
}
