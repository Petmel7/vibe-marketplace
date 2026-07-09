import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AuditLogWriteError,
  getAdminAuditLogById,
  listAdminAuditLogs,
  listAdminAuditLogsOverview,
  recordAdminAudit,
  redactAuditMetadata,
} from '@/features/admin/audit/admin-audit'
import { logError, logInfo } from '@/utils/logger'
import { AuditLogNotFoundError } from '@/lib/errors/operations'

type MockAuditLogRow = {
  id: string
  actorId: string | null
  actorEmail: string | null
  actorRole: string | null
  domain: string
  action: string
  resourceType: string
  resourceId: string | null
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  requestId: string | null
  createdAt: Date
}

const { auditRows, adminAuditLogModel } = vi.hoisted(() => {
  const rows: MockAuditLogRow[] = []

  function filterRows(where?: Record<string, unknown>) {
    return rows.filter((row) => {
      if (where?.actorId && row.actorId !== where.actorId) {
        return false
      }
      if (where?.domain && row.domain !== where.domain) {
        return false
      }
      if (where?.action && row.action !== where.action) {
        return false
      }
      if (where?.resourceType && row.resourceType !== where.resourceType) {
        return false
      }
      if (where?.resourceId && row.resourceId !== where.resourceId) {
        return false
      }

      const createdAtFilter =
        where?.createdAt && typeof where.createdAt === 'object' ? where.createdAt : null

      const gte = createdAtFilter && 'gte' in createdAtFilter ? createdAtFilter.gte : null
      const lte = createdAtFilter && 'lte' in createdAtFilter ? createdAtFilter.lte : null

      if (gte instanceof Date && row.createdAt < gte) {
        return false
      }
      if (lte instanceof Date && row.createdAt > lte) {
        return false
      }

      return true
    })
  }

  const model = {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const row: MockAuditLogRow = {
        id: `audit-${rows.length + 1}`,
        actorId: (data.actorId as string | null | undefined) ?? null,
        actorEmail: (data.actorEmail as string | null | undefined) ?? null,
        actorRole: (data.actorRole as string | null | undefined) ?? null,
        domain: data.domain as string,
        action: data.action as string,
        resourceType: data.resourceType as string,
        resourceId: (data.resourceId as string | null | undefined) ?? null,
        metadata:
          data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
            ? (data.metadata as Record<string, unknown>)
            : null,
        ipAddress: (data.ipAddress as string | null | undefined) ?? null,
        userAgent: (data.userAgent as string | null | undefined) ?? null,
        requestId: (data.requestId as string | null | undefined) ?? null,
        createdAt: new Date(Date.UTC(2026, 5, 11, 12, 0, rows.length)),
      }

      rows.push(row)
      return row
    }),
    findMany: vi.fn(async ({ where, skip = 0, take = rows.length }: { where?: Record<string, unknown>; skip?: number; take?: number }) => {
      return filterRows(where)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .slice(skip, skip + take)
    }),
    count: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
      return filterRows(where).length
    }),
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
      return rows.find((row) => row.id === where.id) ?? null
    }),
  }

  return {
    auditRows: rows,
    adminAuditLogModel: model,
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    adminAuditLog: adminAuditLogModel,
  },
}))

vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}))

describe('admin audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auditRows.length = 0
  })

  it('persists a structured admin audit entry to the database', async () => {
    await recordAdminAudit({
      actorId: 'admin-1',
      actorEmail: 'admin@example.com',
      actorRole: 'ADMIN',
      action: 'approve',
      domain: 'refunds',
      targetId: 'refund-1',
      targetType: 'refund-request',
      metadata: { note: 'approved' },
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
      requestId: 'req-1',
    })

    expect(adminAuditLogModel.create).toHaveBeenCalledTimes(1)
    expect(auditRows).toHaveLength(1)
    expect(auditRows[0]).toMatchObject({
      actorId: 'admin-1',
      actorEmail: 'admin@example.com',
      actorRole: 'ADMIN',
      domain: 'refunds',
      action: 'approve',
      resourceType: 'refund-request',
      resourceId: 'refund-1',
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
      requestId: 'req-1',
    })
    expect(logInfo).toHaveBeenCalledWith(
      'admin-audit',
      expect.objectContaining({
        auditDomain: 'refunds',
        action: 'approve',
        actorId: 'admin-1',
        actorRole: 'ADMIN',
      }),
    )
  })

  it('redacts sensitive metadata keys before persistence', async () => {
    await recordAdminAudit({
      actorId: 'admin-1',
      action: 'sync',
      domain: 'jobs',
      targetType: 'job',
      metadata: {
        safe: 'value',
        authorization: 'Bearer secret',
        rawBody: '{"card":"1234"}',
        nested: {
          privateKey: 'super-secret',
          refreshToken: 'refresh-secret',
        },
      },
    })

    expect(auditRows[0]?.metadata).toEqual({
      safe: 'value',
      authorization: '[redacted]',
      rawBody: '[redacted]',
      nested: {
        privateKey: '[redacted]',
        refreshToken: '[redacted]',
      },
    })
  })

  it('lists audit logs from database records with filters and pagination', async () => {
    await recordAdminAudit({
      actorId: 'admin-1',
      action: 'approve',
      domain: 'refunds',
      targetId: 'refund-1',
      targetType: 'refund-request',
      metadata: { status: 'approved' },
    })
    await recordAdminAudit({
      actorId: 'admin-2',
      action: 'approve',
      domain: 'refunds',
      targetId: 'refund-2',
      targetType: 'refund-request',
      metadata: { status: 'approved' },
    })
    await recordAdminAudit({
      actorId: 'admin-3',
      action: 'suspend',
      domain: 'moderation',
      targetId: 'seller-1',
      targetType: 'seller',
      metadata: { reason: 'abuse' },
    })

    const filtered = await listAdminAuditLogs({
      page: 1,
      limit: 1,
      domain: 'refunds',
      resourceId: 'refund-2',
    })

    expect(filtered.total).toBe(1)
    expect(filtered.items).toHaveLength(1)
    expect(filtered.items[0]).toMatchObject({
      domain: 'refunds',
      resourceId: 'refund-2',
    })
    expect(adminAuditLogModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          domain: 'refunds',
          resourceId: 'refund-2',
        }),
        skip: 0,
        take: 1,
      }),
    )
  })

  it('lists overview audit logs without count and without metadata payload', async () => {
    await recordAdminAudit({
      actorId: 'admin-1',
      action: 'approve',
      domain: 'refunds',
      targetId: 'refund-1',
      targetType: 'refund-request',
      metadata: { status: 'approved', nested: { note: 'keep off overview' } },
    })

    const result = await listAdminAuditLogsOverview({
      page: 1,
      limit: 5,
    })

    expect(result.total).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.metadata).toBeNull()
    expect(adminAuditLogModel.count).not.toHaveBeenCalled()
  })

  it('returns an audit log by id from the database', async () => {
    await recordAdminAudit({
      actorId: 'admin-1',
      action: 'approve',
      domain: 'refunds',
      targetId: 'refund-1',
      targetType: 'refund-request',
    })

    const found = await getAdminAuditLogById('audit-1')

    expect(found.id).toBe('audit-1')
    expect(found.resourceType).toBe('refund-request')
  })

  it('throws a safe not found error for missing audit logs', async () => {
    await expect(getAdminAuditLogById('missing')).rejects.toThrow(AuditLogNotFoundError)
  })

  it('fails safely when db persistence throws', async () => {
    adminAuditLogModel.create.mockRejectedValueOnce(new Error('db down'))

    await expect(
      recordAdminAudit({
        actorId: 'admin-1',
        action: 'recalculate',
        domain: 'risk',
        targetType: 'risk-profile-batch',
      }),
    ).resolves.toBeUndefined()

    expect(logError).toHaveBeenCalledWith(
      'admin-audit:write-failed',
      expect.any(AuditLogWriteError),
      expect.objectContaining({
        auditDomain: 'risk',
        action: 'recalculate',
        actorId: 'admin-1',
      }),
    )
  })

  it('exports a pure metadata redaction helper', () => {
    expect(
      redactAuditMetadata({
        safe: 'value',
        cardNumber: '4111111111111111',
      }),
    ).toEqual({
      safe: 'value',
      cardNumber: '[redacted]',
    })
  })
})
