import { getServerEnv } from '@/config/env'
import { jobRunnerRequestSchema } from '@/features/jobs/jobs.schema'
import { runDueJobs } from '@/features/jobs/jobs.service'
import { JobRunnerAuthError } from '@/lib/errors/job'
import { toErrorResponse } from '@/lib/errors/handleError'

async function parseRequestBody(request: Request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}

function getRunnerSecretFromRequest(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim()
  }

  const cronHeaderSecret = request.headers.get('x-cron-secret')?.trim()
  if (cronHeaderSecret) {
    return cronHeaderSecret
  }

  return request.headers.get('x-job-runner-secret')?.trim() ?? null
}

export async function POST(request: Request) {
  try {
    const { JOB_RUNNER_SECRET } = getServerEnv()
    const requestSecret = getRunnerSecretFromRequest(request)

    if (!JOB_RUNNER_SECRET || !requestSecret || requestSecret !== JOB_RUNNER_SECRET) {
      throw new JobRunnerAuthError()
    }

    const body = await parseRequestBody(request)
    const input = jobRunnerRequestSchema.parse(body)
    const data = await runDueJobs(input)
    return Response.json({ success: true, data })
  } catch (error) {
    return toErrorResponse('POST /api/internal/jobs/run', error)
  }
}
