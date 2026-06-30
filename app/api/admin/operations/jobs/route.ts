import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/session/getSession'
import {
  getAdminOperationsJobs,
} from '@/features/admin/operations/admin-operations.service'
import { adminOperationsJobsQuerySchema } from '@/features/admin/operations/admin-operations.schema'
import { toErrorResponse } from '@/lib/errors/handleError'
import { logInfo, logWarn } from '@/utils/logger'

export async function GET(request: NextRequest): Promise<Response> {
  const requestStartedAt = Date.now()
  try {
    const authStartedAt = Date.now()
    const user = await requireAuth()
    const authDurationMs = Date.now() - authStartedAt
    if (authDurationMs >= 100) {
      logInfo('admin-operations:jobs-auth-timing', {
        domain: 'jobs',
        durationMs: authDurationMs,
      })
    }

    const query = adminOperationsJobsQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    )

    const serviceStartedAt = Date.now()
    const data = await getAdminOperationsJobs(user, query)
    const serviceDurationMs = Date.now() - serviceStartedAt
    const totalDurationMs = Date.now() - requestStartedAt

    if (serviceDurationMs >= 100) {
      logInfo('admin-operations:jobs-service-timing', {
        domain: 'jobs',
        durationMs: serviceDurationMs,
        status: query.status ?? null,
        type: query.type ?? null,
        page: query.page,
        limit: query.limit,
        total: data.total,
        itemCount: data.items.length,
      })
    }

    if (totalDurationMs >= 1000) {
      logWarn('admin-operations:jobs-route-slow', {
        domain: 'jobs',
        durationMs: totalDurationMs,
        status: query.status ?? null,
        type: query.type ?? null,
        page: query.page,
        limit: query.limit,
        total: data.total,
        itemCount: data.items.length,
      })
    }

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            message: error.issues.map((issue) => issue.message).join('; '),
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 },
      )
    }

    return toErrorResponse('GET /api/admin/operations/jobs', error)
  }
}
