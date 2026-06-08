import { Prisma, type Job } from '@/app/generated/prisma/client'
import { JobDefinitionNotFoundError, JobNotFoundError, JobRetryLimitExceededError } from '@/lib/errors/job'
import { logError } from '@/utils/logger'
import type {
  EnqueueJobInputDto,
  JobDto,
  JobPayload,
  JobProcessResultDto,
  JobRunnerRequestDto,
  JobRunnerResponseDto,
  JobsRegistry,
  KnownJobType,
} from './jobs.dto'
import { jobsRegistry } from './jobs.registry'
import {
  claimJobForProcessing,
  createJobRecord,
  findJobByDedupeKey,
  findJobById,
  listRunnableJobs,
  markJobFailed,
  markJobSucceeded,
  requeueJob,
} from './jobs.repository'
import { enqueueJobSchema, jobPayloadSchemaByType } from './jobs.schema'

function toJobDto(job: Job): JobDto {
  return {
    id: job.id,
    type: job.type,
    payload: job.payload as JobPayload,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    runAt: job.runAt.toISOString(),
    lockedAt: job.lockedAt?.toISOString() ?? null,
    processedAt: job.processedAt?.toISOString() ?? null,
    failedAt: job.failedAt?.toISOString() ?? null,
    errorMessage: job.errorMessage ?? null,
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

  try {
    const definition = getJobDefinition(job.type as KnownJobType, registry)
    const payload = parseJobPayload(job.type as KnownJobType, job.payload)
    const result = await definition.run(payload as never)
    const updated = await markJobSucceeded({
      id: job.id,
      attempts,
      processedAt: new Date(),
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

  if (job.attempts >= job.maxAttempts) {
    throw new JobRetryLimitExceededError()
  }

  await requeueJob({
    id: job.id,
    runAt: new Date(),
  })

  return processJob(job.id, { force: true, registry })
}

export async function runDueJobs(
  input: JobRunnerRequestDto,
  registry: JobsRegistry = jobsRegistry,
): Promise<JobRunnerResponseDto> {
  const now = new Date()
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
    items,
  }
}
