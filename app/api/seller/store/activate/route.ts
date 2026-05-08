import { requireAuth } from '@/lib/session/getSession'
import { activateStore } from '@/features/store/store.service'
import { toErrorResponse } from '@/lib/errors/handleError'

/**
 * POST /api/seller/store/activate
 * Activates the authenticated seller's store (requires verified seller status).
 */
export async function POST(): Promise<Response> {
  try {
    const user = await requireAuth()
    const data = await activateStore(user)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('POST /api/seller/store/activate', err)
  }
}
