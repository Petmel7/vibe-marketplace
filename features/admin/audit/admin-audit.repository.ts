import { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type { AdminAuditLogQuery } from './admin-audit'

type CreateAdminAuditLogInput = {
  actorId?: string | null
  actorEmail?: string | null
  actorRole?: string | null
  domain: string
  action: string
  resourceType: string
  resourceId?: string | null
  metadata?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
  requestId?: string | null
}

function buildAdminAuditLogWhere(query: AdminAuditLogQuery): Prisma.AdminAuditLogWhereInput {
  return {
    actorId: query.actorId,
    domain: query.domain,
    action: query.action,
    resourceType: query.resourceType,
    resourceId: query.resourceId,
    createdAt:
      query.dateFrom || query.dateTo
        ? {
            ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
            ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
          }
        : undefined,
  }
}

function toMetadataJson(metadata: Record<string, unknown> | null | undefined) {
  if (metadata == null) {
    return Prisma.DbNull
  }

  return metadata as Prisma.InputJsonValue
}

export async function createAdminAuditLogRecord(input: CreateAdminAuditLogInput) {
  return prisma.adminAuditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail ?? null,
      actorRole: input.actorRole ?? null,
      domain: input.domain,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      metadata: toMetadataJson(input.metadata),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      requestId: input.requestId ?? null,
    },
  })
}

export async function listAdminAuditLogRecords(query: AdminAuditLogQuery) {
  const where = buildAdminAuditLogWhere(query)

  return prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })
}

export async function listAdminAuditLogOverviewRecords(query: AdminAuditLogQuery) {
  const where = buildAdminAuditLogWhere(query)

  return prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    select: {
      id: true,
      actorId: true,
      actorEmail: true,
      actorRole: true,
      domain: true,
      action: true,
      resourceType: true,
      resourceId: true,
      createdAt: true,
    },
  })
}

export async function countAdminAuditLogRecords(query: AdminAuditLogQuery) {
  return prisma.adminAuditLog.count({
    where: buildAdminAuditLogWhere(query),
  })
}

export async function findAdminAuditLogRecordById(id: string) {
  return prisma.adminAuditLog.findUnique({
    where: { id },
  })
}
