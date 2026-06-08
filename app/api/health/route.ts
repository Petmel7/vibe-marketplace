import { getHealthStatus } from '@/features/health/health.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function GET(): Promise<Response> {
  try {
    const data = await getHealthStatus()
    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return toErrorResponse('GET /api/health', error)
  }
}
