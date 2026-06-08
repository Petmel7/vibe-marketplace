import { Prisma, type Job, type JobStatus, type JobType } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type { JobListQueryDto } from './jobs.dto'

function isPrismaUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export async function findJobById(id: string) {
  return prisma.job.findUnique({
    where: { id },
  })
}

export async function findJobByDedupeKey(dedupeKey: string) {
  return prisma.job.findUnique({
    where: { dedupeKey },
  })
}

export async function createJobRecord(input: {
  type: Job['type']
  payload: Prisma.InputJsonValue
  status?: Job['status']
  maxAttempts: number
  runAt: Date
  dedupeKey?: string | null
}) {
  try {
    return await prisma.job.create({
      data: {
        type: input.type,
        payload: input.payload,
        status: input.status ?? 'PENDING',
        attempts: 0,
        maxAttempts: input.maxAttempts,
        runAt: input.runAt,
        dedupeKey: input.dedupeKey ?? null,
        updatedAt: new Date(),
      },
    })
  } catch (error) {
    if (isPrismaUniqueViolation(error) && input.dedupeKey) {
      const existing = await findJobByDedupeKey(input.dedupeKey)
      if (existing) {
        return existing
      }
    }

    throw error
  }
}

export async function claimJobForProcessing(
  id: string,
  now: Date,
  options?: { force?: boolean },
) {
  const result = await prisma.job.updateMany({
    where: {
      id,
      status: { in: ['PENDING', 'FAILED'] },
      ...(options?.force ? {} : { runAt: { lte: now } }),
    },
    data: {
      status: 'PROCESSING',
      lockedAt: now,
      updatedAt: now,
      errorMessage: null,
    },
  })

  return result.count > 0
}

export async function markJobSucceeded(input: {
  id: string
  attempts: number
  processedAt: Date
}) {
  return prisma.job.update({
    where: { id: input.id },
    data: {
      attempts: input.attempts,
      status: 'SUCCEEDED',
      processedAt: input.processedAt,
      failedAt: null,
      lockedAt: null,
      errorMessage: null,
      updatedAt: input.processedAt,
    },
  })
}

export async function markJobFailed(input: {
  id: string
  attempts: number
  failedAt: Date
  errorMessage: string
  runAt: Date
}) {
  return prisma.job.update({
    where: { id: input.id },
    data: {
      attempts: input.attempts,
      status: 'FAILED',
      failedAt: input.failedAt,
      lockedAt: null,
      processedAt: null,
      errorMessage: input.errorMessage,
      runAt: input.runAt,
      updatedAt: input.failedAt,
    },
  })
}

export async function requeueJob(input: {
  id: string
  runAt: Date
}) {
  return prisma.job.update({
    where: { id: input.id },
    data: {
      status: 'PENDING',
      lockedAt: null,
      processedAt: null,
      failedAt: null,
      errorMessage: null,
      runAt: input.runAt,
      updatedAt: new Date(),
    },
  })
}

export async function listRunnableJobs(input: {
  now: Date
  limit: number
}) {
  return prisma.job.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      runAt: { lte: input.now },
    },
    orderBy: [
      { runAt: 'asc' },
      { createdAt: 'asc' },
    ],
    take: input.limit,
  })
}

export async function listJobs(query: JobListQueryDto) {
  return prisma.job.findMany({
    where: {
      ...(query.status ? { status: query.status as JobStatus } : {}),
      ...(query.type ? { type: query.type as JobType } : {}),
    },
    orderBy: [
      { createdAt: 'desc' },
      { runAt: 'desc' },
    ],
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })
}

export async function countJobs(query: Pick<JobListQueryDto, 'status' | 'type'>) {
  return prisma.job.count({
    where: {
      ...(query.status ? { status: query.status as JobStatus } : {}),
      ...(query.type ? { type: query.type as JobType } : {}),
    },
  })
}

export async function cancelJobRecord(id: string, cancelledAt: Date) {
  const result = await prisma.job.updateMany({
    where: {
      id,
      status: 'PENDING',
    },
    data: {
      status: 'CANCELLED',
      lockedAt: null,
      processedAt: null,
      failedAt: null,
      errorMessage: null,
      updatedAt: cancelledAt,
    },
  })

  return result.count > 0
}
