import { getCurrentUser } from '@/lib/session/getSession'
import { logError } from '@/utils/logger'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return Response.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    return Response.json({ success: true, data: user })
  } catch (err) {
    logError('GET /api/auth/me', err)
    return Response.json(
      { success: false, error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
