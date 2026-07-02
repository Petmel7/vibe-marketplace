import type { SessionUser } from '@/features/auth/auth.dto'
import { requireAdmin } from '@/lib/auth/guards'
import {
  getAdminAuditLogById,
  listAdminAuditLogs,
  recordAdminAudit,
  type AdminAuditLogRecord,
} from '@/features/admin/audit/admin-audit'
import {
  getAdminJobById,
  getAdminJobs,
  recoverStaleAdminJobs,
  retryAdminJob,
  requeueStaleAdminJob,
  cancelAdminJob,
  runDueAdminJobs,
} from '@/features/jobs/jobs.service'
import type {
  AdminAuditLogDto,
  AdminAuditLogListDto,
  AdminAuditLogQueryDto,
  AdminOperationsJobDto,
  AdminOperationsJobListDto,
  AdminOperationsJobQueryDto,
  AdminOperationsRecoverStaleRequestDto,
  AdminOperationsRecoverStaleResponseDto,
  AdminOperationsRunDueRequestDto,
  AdminOperationsRunDueResponseDto,
} from './admin-operations.dto'
import { InvalidJobTransitionError, OperationsAccessDeniedError } from '@/lib/errors/operations'
import { JobInvalidStateError } from '@/lib/errors/job'
import type { JobListItemDto } from '@/features/jobs/jobs.dto'

function assertOperationsAdmin(user: SessionUser) {
  try {
    requireAdmin(user)
  } catch {
    throw new OperationsAccessDeniedError()
  }
}

function toOperationsJobDto(
  job: Pick<
    Awaited<ReturnType<typeof getAdminJobById>> | JobListItemDto,
    | 'id'
    | 'type'
    | 'status'
    | 'attempts'
    | 'maxAttempts'
    | 'runAt'
    | 'lockedAt'
    | 'lockExpiresAt'
    | 'stale'
    | 'processedAt'
    | 'failedAt'
    | 'errorMessage'
    | 'dedupeKey'
    | 'createdAt'
    | 'updatedAt'
  >,
): AdminOperationsJobDto {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    runAt: job.runAt,
    lockedAt: job.lockedAt,
    lockExpiresAt: job.lockExpiresAt,
    stale: job.stale,
    processedAt: job.processedAt,
    failedAt: job.failedAt,
    errorMessage: job.errorMessage,
    dedupeKey: job.dedupeKey,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }
}

function toAuditLogDto(record: AdminAuditLogRecord): AdminAuditLogDto {
  return {
    id: record.id,
    actorId: record.actorId,
    actorEmail: record.actorEmail,
    actorRole: record.actorRole,
    domain: record.domain,
    action: record.action,
    resourceType: record.resourceType,
    resourceId: record.resourceId,
    metadata: record.metadata,
    createdAt: record.createdAt,
  }
}

function getActorRole(user: SessionUser) {
  return user.roles.find((role) => role === 'ADMIN') ?? user.roles[0] ?? null
}

async function auditAdminJobAction(
  user: SessionUser,
  action: string,
  resourceType: string,
  resourceId: string | null,
  metadata?: Record<string, unknown> | null,
) {
  await recordAdminAudit({
    actorId: user.id,
    actorEmail: user.email ?? null,
    actorRole: getActorRole(user),
    domain: 'jobs',
    action,
    targetType: resourceType,
    targetId: resourceId,
    metadata,
  })
}

export async function getAdminOperationsJobs(
  user: SessionUser,
  query: AdminOperationsJobQueryDto,
): Promise<AdminOperationsJobListDto> {
  assertOperationsAdmin(user)
  const data = await getAdminJobs(user, query)

  return {
    items: data.items.map(toOperationsJobDto),
    page: data.page,
    limit: data.limit,
    total: data.total,
  }
}

export async function getAdminOperationsJobById(
  user: SessionUser,
  jobId: string,
): Promise<AdminOperationsJobDto> {
  assertOperationsAdmin(user)
  return toOperationsJobDto(await getAdminJobById(user, jobId))
}

export async function retryAdminOperationsJob(
  user: SessionUser,
  jobId: string,
) {
  assertOperationsAdmin(user)

  try {
    const previousJob = await getAdminJobById(user, jobId)
    const result = await retryAdminJob(user, jobId)
    await auditAdminJobAction(user, 'retry', 'job', jobId, {
      previousStatus: previousJob.status,
      jobType: result.job.type,
      status: result.job.status,
      attempts: result.job.attempts,
      dedupeKey: result.job.dedupeKey,
    })
    return result
  } catch (error) {
    if (error instanceof JobInvalidStateError) {
      throw new InvalidJobTransitionError(error.message)
    }
    throw error
  }
}

export async function cancelAdminOperationsJob(
  user: SessionUser,
  jobId: string,
): Promise<AdminOperationsJobDto> {
  assertOperationsAdmin(user)

  try {
    const previousJob = await getAdminJobById(user, jobId)
    const job = await cancelAdminJob(user, jobId)
    await auditAdminJobAction(user, 'cancel', 'job', jobId, {
      previousStatus: previousJob.status,
      jobType: job.type,
      status: job.status,
      attempts: job.attempts,
      dedupeKey: job.dedupeKey,
    })
    return toOperationsJobDto(job)
  } catch (error) {
    if (error instanceof JobInvalidStateError) {
      throw new InvalidJobTransitionError(error.message)
    }
    throw error
  }
}

export async function requeueStaleAdminOperationsJob(
  user: SessionUser,
  jobId: string,
): Promise<AdminOperationsJobDto> {
  assertOperationsAdmin(user)

  try {
    const previousJob = await getAdminJobById(user, jobId)
    const job = await requeueStaleAdminJob(user, jobId)
    await auditAdminJobAction(user, 'requeue', 'job', jobId, {
      previousStatus: previousJob.status,
      jobType: job.type,
      status: job.status,
      attempts: job.attempts,
      dedupeKey: job.dedupeKey,
    })
    return toOperationsJobDto(job)
  } catch (error) {
    if (error instanceof JobInvalidStateError) {
      throw new InvalidJobTransitionError(error.message)
    }
    throw error
  }
}

export async function runDueAdminOperationsJobs(
  user: SessionUser,
  input: AdminOperationsRunDueRequestDto,
): Promise<AdminOperationsRunDueResponseDto> {
  assertOperationsAdmin(user)
  const result = await runDueAdminJobs(user, input)
  await auditAdminJobAction(user, 'run-due', 'job-runner', null, {
    limit: input.limit,
    processed: result.processed,
    recovered: result.recovered,
    succeeded: result.succeeded,
    failed: result.failed,
  })
  return result
}

export async function recoverStaleAdminOperationsJobs(
  user: SessionUser,
  input: AdminOperationsRecoverStaleRequestDto,
): Promise<AdminOperationsRecoverStaleResponseDto> {
  assertOperationsAdmin(user)
  const result = await recoverStaleAdminJobs(user, input)
  await auditAdminJobAction(user, 'recover-stale', 'job-runner', null, {
    limit: input.limit,
    recoveredCount: result.recoveredCount,
    recoveredJobIds: result.recoveredJobIds,
  })
  return result
}

export async function getAdminOperationsAuditLogs(
  user: SessionUser,
  query: AdminAuditLogQueryDto,
): Promise<AdminAuditLogListDto> {
  assertOperationsAdmin(user)
  const data = await listAdminAuditLogs(query)

  return {
    items: data.items.map(toAuditLogDto),
    page: data.page,
    limit: data.limit,
    total: data.total,
  }
}

export async function getAdminOperationsAuditLogById(
  user: SessionUser,
  id: string,
): Promise<AdminAuditLogDto> {
  assertOperationsAdmin(user)
  return toAuditLogDto(await getAdminAuditLogById(id))
}
