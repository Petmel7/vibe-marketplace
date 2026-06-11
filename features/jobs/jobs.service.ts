import { Prisma, type Job } from '@/app/generated/prisma/client'
import { getServerEnv } from '@/config/env'
import type { SessionUser } from '@/features/auth/auth.dto'
import { requireAdmin } from '@/lib/auth/guards'
import {
  JobDefinitionNotFoundError,
  JobInvalidStateError,
  JobNotFoundError,
  JobRetryLimitExceededError,
} from '@/lib/errors/job'
import { logError, logInfo, logWarn } from '@/utils/logger'
import type {
  EnqueueJobInputDto,
  JobDto,
  JobListDto,
  JobListQueryDto,
  JobPayload,
  JobProcessResultDto,
  RecoverStaleJobsResultDto,
  JobRunnerRequestDto,
  JobRunnerResponseDto,
  JobsRegistry,
  KnownJobType,
} from './jobs.dto'
import { jobsRegistry } from './jobs.registry'
import {
  claimJobForProcessing,
  countJobs,
  createJobRecord,
  cancelJobRecord,
  extendJobLockRecord,
  findJobByDedupeKey,
  findJobById,
  listJobs,
  listRunnableJobs,
  listStaleProcessingJobs,
  markJobFailed,
  markJobSucceeded,
  recoverStaleJobsByIds,
  requeueJob,
} from './jobs.repository'
import { enqueueJobSchema, jobPayloadSchemaByType } from './jobs.schema'

function toJobDto(job: Job): JobDto {
  const lockExpiresAt = getJobLockExpiresAt(job.lockedAt)

  return {
    id: job.id,
    type: job.type,
    payload: job.payload as JobPayload,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    runAt: job.runAt.toISOString(),
    lockedAt: job.lockedAt?.toISOString() ?? null,
    lockExpiresAt: lockExpiresAt?.toISOString() ?? null,
    stale: isJobLockStale(job),
    processedAt: job.processedAt?.toISOString() ?? null,
    failedAt: job.failedAt?.toISOString() ?? null,
    errorMessage: job.errorMessage ? job.errorMessage.slice(0, 500) : null,
    dedupeKey: job.dedupeKey ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  }
}

function resolveRunAt(input: string | Date | null | undefined): Date {
  if (!input) {
    return new Date()
  }

  return input instanceof Date ? input : new Date(input)
}

function getJobLockTimeoutSeconds() {
  return getServerEnv().JOB_LOCK_TIMEOUT_SECONDS ?? 300
}

function getJobLockExpiresAt(lockedAt: Date | null | undefined) {
  if (!lockedAt) {
    return null
  }

  return new Date(lockedAt.getTime() + getJobLockTimeoutSeconds() * 1000)
}

function isJobLockStale(job: Pick<Job, 'status' | 'lockedAt'>, now = new Date()) {
  if (job.status !== 'PROCESSING' || !job.lockedAt) {
    return false
  }

  const lockExpiresAt = getJobLockExpiresAt(job.lockedAt)
  return lockExpiresAt != null && lockExpiresAt.getTime() <= now.getTime()
}

function calculateNextRunAt(attempts: number, now = new Date()) {
  const delaySeconds = Math.min(3600, 60 * 2 ** Math.max(attempts - 1, 0))
  return new Date(now.getTime() + delaySeconds * 1000)
}

function normalizeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Job processing failed'
  return message.slice(0, 1000)
}

function normalizeResult(result: unknown): Record<string, unknown> | null {
  if (result == null) {
    return null
  }

  if (typeof result === 'object' && !Array.isArray(result)) {
    return result as Record<string, unknown>
  }

  return {
    value: result,
  }
}

function getJobDefinition(
  type: KnownJobType,
  registry: JobsRegistry,
) {
  const definition = registry[type]
  if (!definition) {
    throw new JobDefinitionNotFoundError(`No job definition registered for ${type}`)
  }

  return definition
}

function parseJobPayload(type: KnownJobType, payload: unknown) {
  const schema = jobPayloadSchemaByType[type]
  return schema.parse(payload)
}

function assertAdmin(user: SessionUser) {
  requireAdmin(user)
}

function assertCanTransitionJob(job: Job, allowedStatuses: Array<Job['status']>, message: string) {
  if (!allowedStatuses.includes(job.status)) {
    throw new JobInvalidStateError(message)
  }
}

export async function enqueueJob<TType extends KnownJobType>(
  input: EnqueueJobInputDto<TType>,
  registry: JobsRegistry = jobsRegistry,
): Promise<JobDto> {
  const parsed = enqueueJobSchema.parse(input)

  if (parsed.dedupeKey) {
    const existing = await findJobByDedupeKey(parsed.dedupeKey)
    if (existing) {
      return toJobDto(existing)
    }
  }

  const definition = getJobDefinition(parsed.type, registry)
  const created = await createJobRecord({
    type: parsed.type,
    payload: parsed.payload as Prisma.InputJsonValue,
    maxAttempts: parsed.maxAttempts ?? definition.maxAttempts ?? 5,
    runAt: resolveRunAt(parsed.runAt),
    dedupeKey: parsed.dedupeKey ?? null,
  })

  return toJobDto(created)
}

export async function processJob(
  jobId: string,
  options?: {
    force?: boolean
    registry?: JobsRegistry
  },
): Promise<JobProcessResultDto> {
  const registry = options?.registry ?? jobsRegistry
  const job = await findJobById(jobId)
  if (!job) {
    throw new JobNotFoundError()
  }

  if (job.status === 'SUCCEEDED' || job.status === 'CANCELLED') {
    return {
      job: toJobDto(job),
      handled: false,
      skipped: true,
      result: null,
    }
  }

  if (job.attempts >= job.maxAttempts) {
    return {
      job: toJobDto(job),
      handled: false,
      skipped: true,
      result: {
        reason: 'max_attempts_reached',
      },
    }
  }

  const now = new Date()
  const claimed = await claimJobForProcessing(job.id, now, { force: options?.force })
  if (!claimed) {
    const latest = await findJobById(job.id)
    if (!latest) {
      throw new JobNotFoundError()
    }

    return {
      job: toJobDto(latest),
      handled: false,
      skipped: true,
      result: {
        reason: 'already_claimed_or_not_due',
      },
    }
  }

  const attempts = job.attempts + 1
  logInfo('jobs:claimed', {
    domain: 'jobs',
    jobId: job.id,
    jobType: job.type,
    attempts,
  })

  try {
    const definition = getJobDefinition(job.type as KnownJobType, registry)
    const payload = parseJobPayload(job.type as KnownJobType, job.payload)
    const result = await definition.run(payload as never)
    const updated = await markJobSucceeded({
      id: job.id,
      attempts,
      processedAt: new Date(),
    })

    logInfo('jobs:completed', {
      domain: 'jobs',
      jobId: job.id,
      jobType: job.type,
      attempts,
    })

    return {
      job: toJobDto(updated),
      handled: true,
      skipped: false,
      result: normalizeResult(result),
    }
  } catch (error) {
    const failedAt = new Date()
    const updated = await markJobFailed({
      id: job.id,
      attempts,
      failedAt,
      errorMessage: normalizeErrorMessage(error),
      runAt: attempts >= job.maxAttempts ? failedAt : calculateNextRunAt(attempts, failedAt),
    })

    logError('jobs:process', error, {
      domain: 'jobs',
      jobId: job.id,
      jobType: job.type,
      attempts,
    })

    return {
      job: toJobDto(updated),
      handled: true,
      skipped: false,
      result: {
        errorMessage: updated.errorMessage,
      },
    }
  }
}

export async function retryJob(
  jobId: string,
  registry: JobsRegistry = jobsRegistry,
): Promise<JobProcessResultDto> {
  const job = await findJobById(jobId)
  if (!job) {
    throw new JobNotFoundError()
  }

  assertCanTransitionJob(job, ['FAILED'], 'Only failed jobs can be retried')

  if (job.attempts >= job.maxAttempts) {
    throw new JobRetryLimitExceededError()
  }

  await requeueJob({
    id: job.id,
    runAt: new Date(),
  })

  return processJob(job.id, { force: true, registry })
}

export async function extendJobLock(jobId: string): Promise<JobDto | null> {
  const now = new Date()
  const extended = await extendJobLockRecord({
    id: jobId,
    lockedAt: now,
  })

  if (!extended) {
    return null
  }

  const updated = await findJobById(jobId)
  return updated ? toJobDto(updated) : null
}

export async function recoverStaleJobs(
  input?: { limit?: number; now?: Date },
): Promise<RecoverStaleJobsResultDto> {
  const now = input?.now ?? new Date()
  const staleBefore = new Date(now.getTime() - getJobLockTimeoutSeconds() * 1000)
  const staleJobs = await listStaleProcessingJobs({
    staleBefore,
    limit: input?.limit ?? 25,
  })

  if (staleJobs.length === 0) {
    return {
      recoveredCount: 0,
      recoveredJobIds: [],
    }
  }

  const recoveredCount = await recoverStaleJobsByIds({
    ids: staleJobs.map((job) => job.id),
    staleBefore,
    recoveredAt: now,
  })
  const recoveredJobIds = staleJobs.slice(0, recoveredCount).map((job) => job.id)

  if (recoveredCount > 0) {
    logWarn('jobs:stale-recovered', {
      domain: 'jobs',
      recoveredCount,
      recoveredJobIds,
    })
  }

  return {
    recoveredCount,
    recoveredJobIds,
  }
}

export async function runDueJobs(
  input: JobRunnerRequestDto,
  registry: JobsRegistry = jobsRegistry,
): Promise<JobRunnerResponseDto> {
  const now = new Date()
  const recovery = await recoverStaleJobs({ limit: input.limit, now })
  const dueJobs = (await listRunnableJobs({
    now,
    limit: input.limit,
  })).filter((job) => job.attempts < job.maxAttempts)

  const items: JobProcessResultDto[] = []

  for (const job of dueJobs) {
    items.push(await processJob(job.id, { registry }))
  }

  return {
    processed: items.length,
    succeeded: items.filter((item) => item.job.status === 'SUCCEEDED').length,
    failed: items.filter((item) => item.job.status === 'FAILED').length,
    recovered: recovery.recoveredCount,
    items,
  }
}

export async function getAdminJobs(
  user: SessionUser,
  query: JobListQueryDto,
): Promise<JobListDto> {
  assertAdmin(user)

  const [items, total] = await Promise.all([
    listJobs(query),
    countJobs(query),
  ])

  return {
    items: items.map(toJobDto),
    page: query.page,
    limit: query.limit,
    total,
  }
}

export async function getAdminJobById(
  user: SessionUser,
  jobId: string,
): Promise<JobDto> {
  assertAdmin(user)

  const job = await findJobById(jobId)
  if (!job) {
    throw new JobNotFoundError()
  }

  return toJobDto(job)
}

export async function retryAdminJob(
  user: SessionUser,
  jobId: string,
  registry: JobsRegistry = jobsRegistry,
): Promise<JobProcessResultDto> {
  assertAdmin(user)

  const job = await findJobById(jobId)
  if (!job) {
    throw new JobNotFoundError()
  }

  assertCanTransitionJob(job, ['FAILED'], 'Only failed jobs can be retried')

  return retryJob(jobId, registry)
}

export async function cancelAdminJob(
  user: SessionUser,
  jobId: string,
): Promise<JobDto> {
  assertAdmin(user)

  const job = await findJobById(jobId)
  if (!job) {
    throw new JobNotFoundError()
  }

  assertCanTransitionJob(job, ['PENDING'], 'Only pending jobs can be cancelled')

  const cancelled = await cancelJobRecord(jobId, new Date())
  if (!cancelled) {
    throw new JobInvalidStateError('Only pending jobs can be cancelled')
  }

  const updated = await findJobById(jobId)
  if (!updated) {
    throw new JobNotFoundError()
  }

  return toJobDto(updated)
}

export async function requeueStaleAdminJob(
  user: SessionUser,
  jobId: string,
): Promise<JobDto> {
  assertAdmin(user)

  const job = await findJobById(jobId)
  if (!job) {
    throw new JobNotFoundError()
  }

  if (!isJobLockStale(job)) {
    throw new JobInvalidStateError('Only stale processing jobs can be requeued')
  }

  const recovered = await recoverStaleJobs({ limit: 25 })
  if (!recovered.recoveredJobIds.includes(jobId)) {
    throw new JobInvalidStateError('Only stale processing jobs can be requeued')
  }

  const updated = await findJobById(jobId)
  if (!updated) {
    throw new JobNotFoundError()
  }

  logWarn('jobs:manual-requeue', {
    domain: 'jobs',
    actorId: user.id,
    jobId,
  })

  return toJobDto(updated)
}

export async function recoverStaleAdminJobs(
  user: SessionUser,
  input?: { limit?: number },
): Promise<RecoverStaleJobsResultDto> {
  assertAdmin(user)
  const result = await recoverStaleJobs({ limit: input?.limit })

  if (result.recoveredCount > 0) {
    logWarn('jobs:manual-recover-stale', {
      domain: 'jobs',
      actorId: user.id,
      recoveredCount: result.recoveredCount,
      recoveredJobIds: result.recoveredJobIds,
    })
  }

  return result
}

export async function runDueAdminJobs(
  user: SessionUser,
  input: JobRunnerRequestDto,
  registry: JobsRegistry = jobsRegistry,
): Promise<JobRunnerResponseDto> {
  assertAdmin(user)

  const boundedInput = {
    limit: Math.min(input.limit, 25),
  }

  return runDueJobs(boundedInput, registry)
}
