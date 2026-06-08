import { getDeepHealthStatus } from '@/features/health/health.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function GET(): Promise<Response> {
  try {
    const data = await getDeepHealthStatus()
    const status = data.status === 'ok' ? 200 : 503

    return Response.json({ success: true, data }, { status })
  } catch (error) {
    return toErrorResponse('GET /api/health/deep', error)
  }
}
