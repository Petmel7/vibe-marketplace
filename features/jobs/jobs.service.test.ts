import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/jobs/jobs.repository', () => ({
  claimJobForProcessing: vi.fn(),
  createJobRecord: vi.fn(),
  findJobByDedupeKey: vi.fn(),
  findJobById: vi.fn(),
  listRunnableJobs: vi.fn(),
  markJobFailed: vi.fn(),
  markJobSucceeded: vi.fn(),
  requeueJob: vi.fn(),
}))

vi.mock('@/features/jobs/jobs.registry', () => ({
  jobsRegistry: {
    SEND_EMAIL: { type: 'SEND_EMAIL', maxAttempts: 5, run: vi.fn(async () => ({ ok: true })) },
    RECALCULATE_PRODUCT_METRICS: {
      type: 'RECALCULATE_PRODUCT_METRICS',
      maxAttempts: 3,
      run: vi.fn(async () => ({ ok: true })),
    },
    RECALCULATE_RISK_PROFILE: {
      type: 'RECALCULATE_RISK_PROFILE',
      maxAttempts: 5,
      run: vi.fn(async () => ({ ok: true })),
    },
    SYNC_SHIPMENT_STATUS: {
      type: 'SYNC_SHIPMENT_STATUS',
      maxAttempts: 5,
      run: vi.fn(async () => ({ ok: true })),
    },
    RELEASE_SELLER_FUNDS: {
      type: 'RELEASE_SELLER_FUNDS',
      maxAttempts: 3,
      run: vi.fn(async () => ({ ok: true })),
    },
    REFRESH_ANALYTICS: {
      type: 'REFRESH_ANALYTICS',
      maxAttempts: 3,
      run: vi.fn(async () => ({ ok: true })),
    },
    PROCESS_NOTIFICATION_DIGEST: {
      type: 'PROCESS_NOTIFICATION_DIGEST',
      maxAttempts: 3,
      run: vi.fn(async () => ({ ok: true })),
    },
  },
}))

import {
  claimJobForProcessing,
  createJobRecord,
  findJobByDedupeKey,
  findJobById,
  listRunnableJobs,
  markJobFailed,
  markJobSucceeded,
  requeueJob,
} from '@/features/jobs/jobs.repository'
import { JobRetryLimitExceededError } from '@/lib/errors/job'
import { enqueueJob, processJob, retryJob, runDueJobs } from './jobs.service'
import type { JobDefinition, JobsRegistry } from './jobs.dto'

const mockRepo = {
  claimJobForProcessing: vi.mocked(claimJobForProcessing),
  createJobRecord: vi.mocked(createJobRecord),
  findJobByDedupeKey: vi.mocked(findJobByDedupeKey),
  findJobById: vi.mocked(findJobById),
  listRunnableJobs: vi.mocked(listRunnableJobs),
  markJobFailed: vi.mocked(markJobFailed),
  markJobSucceeded: vi.mocked(markJobSucceeded),
  requeueJob: vi.mocked(requeueJob),
}

function makeJob(overrides: Partial<Awaited<ReturnType<typeof createJobRecord>>> = {}) {
  return {
    id: 'job-1',
    type: 'SEND_EMAIL',
    payload: { emailEventId: '5f8f8c8e-8f8c-4c8e-9f8c-8e8f8c8e8f8c' },
    status: 'PENDING',
    attempts: 0,
    maxAttempts: 5,
    runAt: new Date('2026-06-08T12:00:00.000Z'),
    lockedAt: null,
    processedAt: null,
    failedAt: null,
    errorMessage: null,
    dedupeKey: 'dedupe:1',
    createdAt: new Date('2026-06-08T12:00:00.000Z'),
    updatedAt: new Date('2026-06-08T12:00:00.000Z'),
    ...overrides,
  } as NonNullable<Awaited<ReturnType<typeof createJobRecord>>>
}

function buildRegistry(
  overrides?: Partial<JobsRegistry>,
): JobsRegistry {
  const defaultRun = vi.fn(async () => ({ ok: true }))

  return {
    SEND_EMAIL: { type: 'SEND_EMAIL', maxAttempts: 5, run: defaultRun as JobDefinition<'SEND_EMAIL'>['run'] },
    RECALCULATE_PRODUCT_METRICS: {
      type: 'RECALCULATE_PRODUCT_METRICS',
      maxAttempts: 3,
      run: defaultRun as JobDefinition<'RECALCULATE_PRODUCT_METRICS'>['run'],
    },
    RECALCULATE_RISK_PROFILE: {
      type: 'RECALCULATE_RISK_PROFILE',
      maxAttempts: 5,
      run: defaultRun as JobDefinition<'RECALCULATE_RISK_PROFILE'>['run'],
    },
    SYNC_SHIPMENT_STATUS: {
      type: 'SYNC_SHIPMENT_STATUS',
      maxAttempts: 5,
      run: defaultRun as JobDefinition<'SYNC_SHIPMENT_STATUS'>['run'],
    },
    RELEASE_SELLER_FUNDS: {
      type: 'RELEASE_SELLER_FUNDS',
      maxAttempts: 3,
      run: defaultRun as JobDefinition<'RELEASE_SELLER_FUNDS'>['run'],
    },
    REFRESH_ANALYTICS: {
      type: 'REFRESH_ANALYTICS',
      maxAttempts: 3,
      run: defaultRun as JobDefinition<'REFRESH_ANALYTICS'>['run'],
    },
    PROCESS_NOTIFICATION_DIGEST: {
      type: 'PROCESS_NOTIFICATION_DIGEST',
      maxAttempts: 3,
      run: defaultRun as JobDefinition<'PROCESS_NOTIFICATION_DIGEST'>['run'],
    },
    ...(overrides ?? {}),
  }
}

describe('jobs.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('enqueues a new job', async () => {
    mockRepo.findJobByDedupeKey.mockResolvedValue(null)
    mockRepo.createJobRecord.mockResolvedValue(makeJob() as never)

    const result = await enqueueJob(
      {
        type: 'SEND_EMAIL',
        payload: { emailEventId: '5f8f8c8e-8f8c-4c8e-9f8c-8e8f8c8e8f8c' },
        dedupeKey: 'dedupe:1',
      },
      buildRegistry(),
    )

    expect(result.id).toBe('job-1')
    expect(mockRepo.createJobRecord).toHaveBeenCalledOnce()
  })

  it('dedupes a job by dedupe key', async () => {
    mockRepo.findJobByDedupeKey.mockResolvedValue(makeJob() as never)

    const result = await enqueueJob(
      {
        type: 'SEND_EMAIL',
        payload: { emailEventId: '5f8f8c8e-8f8c-4c8e-9f8c-8e8f8c8e8f8c' },
        dedupeKey: 'dedupe:1',
      },
      buildRegistry(),
    )

    expect(result.id).toBe('job-1')
    expect(mockRepo.createJobRecord).not.toHaveBeenCalled()
  })

  it('processes a job successfully', async () => {
    const run = vi.fn(async () => ({ delivered: true }))
    const registry = buildRegistry({
      SEND_EMAIL: { type: 'SEND_EMAIL', maxAttempts: 5, run: run as never },
    })

    mockRepo.findJobById.mockResolvedValue(makeJob() as never)
    mockRepo.claimJobForProcessing.mockResolvedValue(true)
    mockRepo.markJobSucceeded.mockResolvedValue(
      makeJob({
        status: 'SUCCEEDED',
        attempts: 1,
        processedAt: new Date('2026-06-08T12:05:00.000Z'),
      }) as never,
    )

    const result = await processJob('job-1', { registry })

    expect(run).toHaveBeenCalledWith({ emailEventId: '5f8f8c8e-8f8c-4c8e-9f8c-8e8f8c8e8f8c' })
    expect(result.job.status).toBe('SUCCEEDED')
    expect(result.result).toEqual({ delivered: true })
  })

  it('marks a job failed and schedules retry with exponential backoff', async () => {
    const run = vi.fn(async () => {
      throw new Error('boom')
    })
    const registry = buildRegistry({
      SEND_EMAIL: { type: 'SEND_EMAIL', maxAttempts: 5, run: run as never },
    })

    mockRepo.findJobById.mockResolvedValue(makeJob() as never)
    mockRepo.claimJobForProcessing.mockResolvedValue(true)
    mockRepo.markJobFailed.mockImplementation(async (input) =>
      makeJob({
        status: 'FAILED',
        attempts: input.attempts,
        failedAt: input.failedAt,
        runAt: input.runAt,
        errorMessage: input.errorMessage,
      }) as never,
    )

    const result = await processJob('job-1', { registry })

    expect(result.job.status).toBe('FAILED')
    expect(result.job.attempts).toBe(1)
    expect(result.job.errorMessage).toBe('boom')
    expect(mockRepo.markJobFailed).toHaveBeenCalledOnce()

    const [{ runAt, failedAt }] = mockRepo.markJobFailed.mock.calls[0]
    expect(runAt.getTime()).toBeGreaterThan(failedAt.getTime())
  })

  it('does not process jobs that already exhausted max attempts', async () => {
    mockRepo.findJobById.mockResolvedValue(
      makeJob({
        attempts: 5,
        maxAttempts: 5,
        status: 'FAILED',
      }) as never,
    )

    const result = await processJob('job-1', { registry: buildRegistry() })

    expect(result.skipped).toBe(true)
    expect(result.result).toEqual({ reason: 'max_attempts_reached' })
    expect(mockRepo.claimJobForProcessing).not.toHaveBeenCalled()
  })

  it('requeues a job before retrying it', async () => {
    const run = vi.fn(async () => ({ retried: true }))
    const registry = buildRegistry({
      SEND_EMAIL: { type: 'SEND_EMAIL', maxAttempts: 5, run: run as never },
    })

    mockRepo.findJobById
      .mockResolvedValueOnce(makeJob({ status: 'FAILED', attempts: 1 }) as never)
      .mockResolvedValueOnce(makeJob({ status: 'FAILED', attempts: 1 }) as never)
    mockRepo.requeueJob.mockResolvedValue(makeJob({ status: 'PENDING', attempts: 1 }) as never)
    mockRepo.claimJobForProcessing.mockResolvedValue(true)
    mockRepo.markJobSucceeded.mockResolvedValue(
      makeJob({
        status: 'SUCCEEDED',
        attempts: 2,
        processedAt: new Date('2026-06-08T12:10:00.000Z'),
      }) as never,
    )

    const result = await retryJob('job-1', registry)

    expect(mockRepo.requeueJob).toHaveBeenCalledOnce()
    expect(result.job.status).toBe('SUCCEEDED')
  })

  it('blocks retry when max attempts are exhausted', async () => {
    mockRepo.findJobById.mockResolvedValue(
      makeJob({
        status: 'FAILED',
        attempts: 5,
        maxAttempts: 5,
      }) as never,
    )

    await expect(retryJob('job-1', buildRegistry())).rejects.toThrow(JobRetryLimitExceededError)
    expect(mockRepo.requeueJob).not.toHaveBeenCalled()
  })

  it('runs only due jobs from the internal runner service', async () => {
    const duePending = makeJob({ id: 'job-1', status: 'PENDING', attempts: 0, maxAttempts: 3 })
    const dueFailed = makeJob({ id: 'job-2', status: 'FAILED', attempts: 1, maxAttempts: 3 })
    const exhausted = makeJob({ id: 'job-3', status: 'FAILED', attempts: 3, maxAttempts: 3 })

    mockRepo.listRunnableJobs.mockResolvedValue([duePending, dueFailed, exhausted] as never)
    mockRepo.findJobById
      .mockResolvedValueOnce(duePending as never)
      .mockResolvedValueOnce(dueFailed as never)
    mockRepo.claimJobForProcessing.mockResolvedValue(true)
    mockRepo.markJobSucceeded
      .mockResolvedValueOnce(makeJob({ id: 'job-1', status: 'SUCCEEDED', attempts: 1 }) as never)
      .mockResolvedValueOnce(makeJob({ id: 'job-2', status: 'SUCCEEDED', attempts: 2 }) as never)

    const result = await runDueJobs({ limit: 10 }, buildRegistry())

    expect(result.processed).toBe(2)
    expect(result.succeeded).toBe(2)
    expect(result.failed).toBe(0)
  })
})
