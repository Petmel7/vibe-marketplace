import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AbuseReportActionType,
  AbuseReportReason,
  AbuseReportStatus,
  AbuseReportTargetType,
  UserRole,
} from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import { AdminAccessError } from '@/lib/errors/admin'
import {
  AbuseReportModerationError,
  DuplicateAbuseReportError,
  UnsupportedAbuseActionError,
} from '@/lib/errors/abuse-report'
import * as abuseReportRepository from './abuse-reports.repository'
import * as abuseReportService from './abuse-reports.service'
import * as notificationsService from '@/features/notifications/notifications.service'
import * as reviewService from '@/features/review/review.service'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('./abuse-reports.repository')
vi.mock('@/features/notifications/notifications.service')
vi.mock('@/features/review/review.service')
vi.mock('@/utils/logger', () => ({
  logError: vi.fn(),
}))

const mockRepository = vi.mocked(abuseReportRepository)
const mockNotifications = vi.mocked(notificationsService)
const mockReviewService = vi.mocked(reviewService)

const buyerUser: SessionUser = {
  id: 'buyer-1',
  email: 'buyer@example.com',
  roles: [UserRole.BUYER],
}

const sellerUser: SessionUser = {
  id: 'seller-1',
  email: 'seller@example.com',
  roles: [UserRole.SELLER],
}

const adminUser: SessionUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  roles: [UserRole.ADMIN],
}

function makeProductTarget(overrides: Record<string, unknown> = {}) {
  return {
    targetType: AbuseReportTargetType.PRODUCT,
    id: 'product-1',
    productName: 'Summer Dress',
    productStatus: 'PUBLISHED',
    ownerUserId: sellerUser.id,
    storeId: 'store-1',
    storeName: 'Dress Store',
    ...overrides,
  }
}

function makeReviewTarget(overrides: Record<string, unknown> = {}) {
  return {
    targetType: AbuseReportTargetType.REVIEW,
    id: 'review-1',
    reviewUserId: 'reviewer-1',
    reviewStatus: 'PUBLISHED',
    reviewSnippet: 'Spam review',
    productId: 'product-1',
    productName: 'Summer Dress',
    storeId: 'store-1',
    storeName: 'Dress Store',
    storeOwnerId: sellerUser.id,
    ...overrides,
  }
}

function makeReportRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-1',
    reporterId: buyerUser.id,
    targetType: AbuseReportTargetType.PRODUCT,
    targetId: 'product-1',
    reason: AbuseReportReason.SPAM,
    description: 'Looks suspicious',
    status: AbuseReportStatus.PENDING,
    assignedAdminId: null,
    resolvedById: null,
    resolvedAt: null,
    resolutionNote: null,
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    updatedAt: new Date('2026-06-02T10:00:00.000Z'),
    reporter: {
      id: buyerUser.id,
      email: buyerUser.email,
      name: 'Buyer Name',
      profile: {
        displayName: 'Buyer Display',
      },
    },
    assignedAdmin: null,
    resolvedBy: null,
    actions: [],
    ...overrides,
  }
}

function makeActionRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'action-1',
    reportId: 'report-1',
    adminId: adminUser.id,
    actionType: AbuseReportActionType.HIDE_REVIEW,
    note: 'Hidden after moderation',
    metadata: null,
    createdAt: new Date('2026-06-02T11:00:00.000Z'),
    admin: {
      id: adminUser.id,
      email: adminUser.email,
      name: 'Admin Name',
    },
    ...overrides,
  }
}

describe('abuse-reports.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotifications.createAdminNotification.mockResolvedValue([] as never)
    mockNotifications.notifyUser.mockResolvedValue({} as never)
  })

  it('allows an authenticated user to create a product report', async () => {
    mockRepository.findReportTargetContext.mockResolvedValue(makeProductTarget() as never)
    mockRepository.findActiveReportByReporterAndTarget.mockResolvedValue(null)
    mockRepository.createAbuseReportRecord.mockResolvedValue(makeReportRecord() as never)

    const result = await abuseReportService.createReport(buyerUser, {
      targetType: AbuseReportTargetType.PRODUCT,
      targetId: 'product-1',
      reason: AbuseReportReason.SPAM,
      description: 'Підозрілий товар',
    })

    expect(mockRepository.createAbuseReportRecord).toHaveBeenCalledWith({
      reporterId: buyerUser.id,
      targetType: AbuseReportTargetType.PRODUCT,
      targetId: 'product-1',
      reason: AbuseReportReason.SPAM,
      description: 'Підозрілий товар',
    })
    expect(result.id).toBe('report-1')
    expect(result.targetPreview?.productName).toBe('Summer Dress')
  })

  it('allows an authenticated user to create a review report', async () => {
    mockRepository.findReportTargetContext.mockResolvedValue(makeReviewTarget() as never)
    mockRepository.findActiveReportByReporterAndTarget.mockResolvedValue(null)
    mockRepository.createAbuseReportRecord.mockResolvedValue(
      makeReportRecord({
        targetType: AbuseReportTargetType.REVIEW,
        targetId: 'review-1',
      }) as never,
    )

    const result = await abuseReportService.createReport(buyerUser, {
      targetType: AbuseReportTargetType.REVIEW,
      targetId: 'review-1',
      reason: AbuseReportReason.HARASSMENT,
      description: 'Образливий зміст',
    })

    expect(result.targetType).toBe(AbuseReportTargetType.REVIEW)
    expect(result.targetPreview?.reviewSnippet).toBe('Spam review')
  })

  it('requires a detailed description when reason is OTHER', async () => {
    await expect(
      abuseReportService.createReport(buyerUser, {
        targetType: AbuseReportTargetType.PRODUCT,
        targetId: 'product-1',
        reason: AbuseReportReason.OTHER,
        description: 'bad',
      }),
    ).rejects.toThrow(AbuseReportModerationError)
  })

  it('blocks duplicate active reports for the same target', async () => {
    mockRepository.findReportTargetContext.mockResolvedValue(makeProductTarget() as never)
    mockRepository.findActiveReportByReporterAndTarget.mockResolvedValue(makeReportRecord() as never)

    await expect(
      abuseReportService.createReport(buyerUser, {
        targetType: AbuseReportTargetType.PRODUCT,
        targetId: 'product-1',
        reason: AbuseReportReason.SPAM,
      }),
    ).rejects.toThrow(DuplicateAbuseReportError)
  })

  it('lists only the current user reports', async () => {
    mockRepository.listReportsByReporterId.mockResolvedValue({
      items: [makeReportRecord()],
      total: 1,
    })
    mockRepository.findReportTargetContext.mockResolvedValue(makeProductTarget() as never)

    const result = await abuseReportService.getMyReports(buyerUser, {
      page: 1,
      limit: 20,
      status: undefined,
    })

    expect(mockRepository.listReportsByReporterId).toHaveBeenCalledWith(buyerUser.id, {
      page: 1,
      limit: 20,
      status: undefined,
    })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.id).toBe('report-1')
  })

  it('lets admins list and filter reports', async () => {
    mockRepository.listAdminReports.mockResolvedValue({
      items: [makeReportRecord()],
      total: 1,
    })
    mockRepository.findReportTargetContext.mockResolvedValue(makeProductTarget() as never)

    const result = await abuseReportService.getAdminReports(adminUser, {
      page: 1,
      limit: 20,
      status: AbuseReportStatus.PENDING,
      targetType: AbuseReportTargetType.PRODUCT,
      reason: AbuseReportReason.SPAM,
      assignedAdminId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    })

    expect(mockRepository.listAdminReports).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AbuseReportStatus.PENDING,
        targetType: AbuseReportTargetType.PRODUCT,
      }),
    )
    expect(result.total).toBe(1)
  })

  it('lets admins resolve reports and notifies the reporter', async () => {
    mockRepository.findAbuseReportById.mockResolvedValue(makeReportRecord() as never)
    mockRepository.updateReportStatusAndCreateAction.mockResolvedValue({
      report: makeReportRecord({
        status: AbuseReportStatus.RESOLVED,
        resolvedBy: {
          id: adminUser.id,
          email: adminUser.email,
          name: 'Admin Name',
        },
        resolvedAt: new Date('2026-06-02T12:00:00.000Z'),
        resolutionNote: 'Handled',
      }),
      action: makeActionRecord({
        actionType: AbuseReportActionType.NO_ACTION,
        note: 'Handled',
      }),
    } as never)
    mockRepository.findReportTargetContext.mockResolvedValue(makeProductTarget() as never)

    const result = await abuseReportService.updateAdminReportStatus(adminUser, 'report-1', {
      status: AbuseReportStatus.RESOLVED,
      resolutionNote: 'Handled',
    })

    expect(mockRepository.updateReportStatusAndCreateAction).toHaveBeenCalled()
    expect(result.resolutionNote).toBe('Handled')
    expect(mockNotifications.notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: buyerUser.id,
        type: 'ADMIN_ALERT',
      }),
    )
  })

  it('lets admins dismiss reports', async () => {
    mockRepository.findAbuseReportById.mockResolvedValue(makeReportRecord() as never)
    mockRepository.updateReportStatusAndCreateAction.mockResolvedValue({
      report: makeReportRecord({
        status: AbuseReportStatus.DISMISSED,
        resolvedAt: new Date('2026-06-02T12:00:00.000Z'),
        resolutionNote: 'No violation found',
      }),
      action: makeActionRecord({
        actionType: AbuseReportActionType.NO_ACTION,
        note: 'No violation found',
      }),
    } as never)
    mockRepository.findReportTargetContext.mockResolvedValue(makeProductTarget() as never)

    const result = await abuseReportService.updateAdminReportStatus(adminUser, 'report-1', {
      status: AbuseReportStatus.DISMISSED,
      resolutionNote: 'No violation found',
    })

    expect(result.status).toBe(AbuseReportStatus.DISMISSED)
  })

  it('lets admins escalate reports', async () => {
    mockRepository.findAbuseReportById.mockResolvedValue(makeReportRecord() as never)
    mockRepository.updateReportStatusAndCreateAction.mockResolvedValue({
      report: makeReportRecord({
        status: AbuseReportStatus.ESCALATED,
      }),
      action: makeActionRecord({
        actionType: AbuseReportActionType.ESCALATE,
        note: 'Need deeper review',
      }),
    } as never)
    mockRepository.findReportTargetContext.mockResolvedValue(makeProductTarget() as never)

    const result = await abuseReportService.updateAdminReportStatus(adminUser, 'report-1', {
      status: AbuseReportStatus.ESCALATED,
      resolutionNote: 'Need deeper review',
    })

    expect(result.status).toBe(AbuseReportStatus.ESCALATED)
  })

  it('audits admin actions and applies supported moderation handlers', async () => {
    mockRepository.findAbuseReportById.mockResolvedValue(
      makeReportRecord({
        targetType: AbuseReportTargetType.REVIEW,
        targetId: 'review-1',
      }) as never,
    )
    mockRepository.createAbuseReportActionRecord.mockResolvedValue(
      makeActionRecord({
        actionType: AbuseReportActionType.HIDE_REVIEW,
        reportId: 'report-1',
      }) as never,
    )
    mockRepository.findReportTargetContext.mockResolvedValue(makeReviewTarget() as never)
    mockReviewService.moderateReview.mockResolvedValue({} as never)

    const result = await abuseReportService.addAdminReportAction(adminUser, 'report-1', {
      actionType: AbuseReportActionType.HIDE_REVIEW,
      note: 'Приховано',
    })

    expect(mockRepository.createAbuseReportActionRecord).toHaveBeenCalledWith(
      'report-1',
      adminUser.id,
      expect.objectContaining({
        actionType: AbuseReportActionType.HIDE_REVIEW,
      }),
    )
    expect(mockReviewService.moderateReview).toHaveBeenCalledWith(
      adminUser,
      'review-1',
      expect.objectContaining({
        action: 'hide',
      }),
    )
    expect(result.reportId).toBe('report-1')
  })

  it('fails safely for unsupported actions after auditing them', async () => {
    mockRepository.findAbuseReportById.mockResolvedValue(makeReportRecord() as never)
    mockRepository.createAbuseReportActionRecord.mockResolvedValue(
      makeActionRecord({
        actionType: AbuseReportActionType.SUSPEND_SELLER,
      }) as never,
    )
    mockRepository.findReportTargetContext.mockResolvedValue(
      {
        targetType: AbuseReportTargetType.ORDER,
        id: 'order-1',
        orderUserId: buyerUser.id,
        status: 'paid',
        totalAmount: { toNumber: () => 100 } as never,
        storeOwners: [{ storeId: 'store-1', storeName: 'Dress Store', ownerId: sellerUser.id }],
      } as never,
    )

    await expect(
      abuseReportService.addAdminReportAction(adminUser, 'report-1', {
        actionType: AbuseReportActionType.SUSPEND_SELLER,
      }),
    ).rejects.toThrow(UnsupportedAbuseActionError)

    expect(mockRepository.createAbuseReportActionRecord).toHaveBeenCalled()
  })

  it('does not let notification enqueue failures break report creation flow', async () => {
    mockRepository.findReportTargetContext.mockResolvedValue(makeProductTarget() as never)
    mockRepository.findActiveReportByReporterAndTarget.mockResolvedValue(null)
    mockRepository.createAbuseReportRecord.mockResolvedValue(makeReportRecord() as never)
    mockNotifications.createAdminNotification.mockRejectedValue(new Error('queue failed'))

    const result = await abuseReportService.createReport(buyerUser, {
      targetType: AbuseReportTargetType.PRODUCT,
      targetId: 'product-1',
      reason: AbuseReportReason.SPAM,
      description: 'Порушення правил',
    })

    expect(result.id).toBe('report-1')
  })

  it('blocks non-admin users from admin report APIs', async () => {
    await expect(
      abuseReportService.getAdminReports(buyerUser, {
        page: 1,
        limit: 20,
        status: undefined,
        targetType: undefined,
        reason: undefined,
        assignedAdminId: undefined,
        dateFrom: undefined,
        dateTo: undefined,
      }),
    ).rejects.toThrow(AdminAccessError)
  })
})
