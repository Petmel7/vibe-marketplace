import type { SessionUser } from '@/features/auth/auth.dto'
import { requireAdmin } from '@/lib/auth/guards'
import {
  getAdminAuditLogById,
  listAdminAuditLogs,
  type AdminAuditLogRecord,
} from '@/features/admin/audit/admin-audit'
import {
  getAdminJobById,
  getAdminJobs,
  retryAdminJob,
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
  AdminOperationsRunDueRequestDto,
  AdminOperationsRunDueResponseDto,
} from './admin-operations.dto'
import { InvalidJobTransitionError, OperationsAccessDeniedError } from '@/lib/errors/operations'
import { JobInvalidStateError } from '@/lib/errors/job'

function assertOperationsAdmin(user: SessionUser) {
  try {
    requireAdmin(user)
  } catch {
    throw new OperationsAccessDeniedError()
  }
}

function toOperationsJobDto(job: Awaited<ReturnType<typeof getAdminJobById>>): AdminOperationsJobDto {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    runAt: job.runAt,
    lockedAt: job.lockedAt,
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
    domain: record.domain,
    action: record.action,
    resourceType: record.resourceType,
    resourceId: record.resourceId,
    metadata: record.metadata,
    createdAt: record.createdAt,
  }
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
    return await retryAdminJob(user, jobId)
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
    return toOperationsJobDto(await cancelAdminJob(user, jobId))
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
  return runDueAdminJobs(user, input)
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
