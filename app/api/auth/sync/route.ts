import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncUser } from '@/features/auth/auth.service'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors/auth'
import { logError } from '@/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const adminClient = createAdminClient()
    const { data, error } = await adminClient.auth.getUser(token)

    if (error || !data.user) {
      return Response.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    const sessionUser = await syncUser(data.user)

    return Response.json({ success: true, data: sessionUser })
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return Response.json(
        { success: false, error: { message: err.message, code: err.code } },
        { status: 401 }
      )
    }
    if (err instanceof ForbiddenError) {
      return Response.json(
        { success: false, error: { message: err.message, code: err.code } },
        { status: 403 }
      )
    }
    logError('POST /api/auth/sync', err)
    return Response.json(
      { success: false, error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
