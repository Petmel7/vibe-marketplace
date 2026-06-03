import {
  AbuseReportActionType,
  AbuseReportReason,
  AbuseReportStatus,
  AbuseReportTargetType,
  NotificationType,
  type Prisma,
} from '@/app/generated/prisma/client'
import { assertAdminAccess, assertNotSelfModeration } from '@/lib/auth/adminGuards'
import type { SessionUser } from '@/features/auth/auth.dto'
import {
  AbuseReportModerationError,
  AbuseReportNotFoundError,
  AbuseReportOwnershipError,
  AbuseReportTargetNotFoundError,
  DuplicateAbuseReportError,
  UnsupportedAbuseActionError,
} from '@/lib/errors/abuse-report'
import { logError } from '@/utils/logger'
import {
  archiveProduct,
  rejectProduct,
} from '@/features/moderation/product/product-moderation.service'
import { suspendSeller } from '@/features/moderation/seller/seller-moderation.service'
import { moderateReview } from '@/features/review/review.service'
import {
  createAdminNotification,
  notifyUser,
} from '@/features/notifications/notifications.service'
import { recordAbuseReportCreatedRiskSignals } from '@/features/risk/risk.service'
import type {
  AdminReportQueueDto,
  MyReportDto,
  MyReportListDto,
  ReportActionDto,
  ReportDetailDto,
  ReportMutationResultDto,
  ReportSummaryDto,
} from './abuse-reports.dto'
import {
  type AbuseReportActionRecord,
  type AbuseReportRecord,
  type AbuseReportTargetContext,
  createAbuseReportActionRecord,
  createAbuseReportRecord,
  findAbuseReportById,
  findActiveReportByReporterAndTarget,
  findReportTargetContext,
  findSellerProfileByUserId,
  listAdminReports,
  listReportsByReporterId,
  updateReportStatusAndCreateAction,
  updateStoreActiveState,
} from './abuse-reports.repository'
import type {
  AdminReportsQuery,
  CreateAbuseReportActionInput,
  CreateAbuseReportInput,
  MyReportsQuery,
  UpdateAbuseReportStatusInput,
} from './abuse-reports.schema'

function maskEmail(email: string): string {
  const [localPart, domain = ''] = email.split('@')
  if (!localPart) {
    return email
  }

  if (localPart.length <= 2) {
    return `${localPart[0] ?? '*'}***@${domain}`
  }

  return `${localPart.slice(0, 2)}***@${domain}`
}

function previewDescription(description: string | null | undefined): string | null {
  if (!description) return null
  const trimmed = description.trim()
  if (!trimmed) return null
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed
}

function normalizeDescription(description: string | null | undefined): string | null {
  const trimmed = description?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : null
}

function assertDescriptionQuality(input: CreateAbuseReportInput): void {
  const description = normalizeDescription(input.description)

  if (input.reason === AbuseReportReason.OTHER && (!description || description.length < 10)) {
    throw new AbuseReportModerationError(
      'Опишіть проблему детальніше, якщо обираєте іншу причину скарги.',
    )
  }

  if (description && description.length < 5) {
    throw new AbuseReportModerationError('Опис скарги занадто короткий.')
  }
}

function getTargetActionUrl(target: AbuseReportTargetContext): string | null {
  switch (target.targetType) {
    case AbuseReportTargetType.PRODUCT:
      return `/products/${target.id}`
    case AbuseReportTargetType.REVIEW:
      return `/products/${target.productId}`
    case AbuseReportTargetType.STORE:
      return `/stores/${target.storeSlug}`
    case AbuseReportTargetType.USER:
      return null
    case AbuseReportTargetType.ORDER:
      return `/profile/orders/${target.id}`
    default:
      return null
  }
}

async function buildTargetPreview(
  targetType: AbuseReportTargetType,
  targetId: string,
): Promise<ReportSummaryDto['targetPreview']> {
  const target = await findReportTargetContext(targetType, targetId)
  if (!target) {
    return null
  }

  switch (target.targetType) {
    case AbuseReportTargetType.PRODUCT:
      return {
        targetType,
        targetId,
        productName: target.productName,
      }
    case AbuseReportTargetType.REVIEW:
      return {
        targetType,
        targetId,
        reviewSnippet: previewDescription(target.reviewSnippet),
        productName: target.productName,
      }
    case AbuseReportTargetType.STORE:
      return {
        targetType,
        targetId,
        storeName: target.storeName,
      }
    case AbuseReportTargetType.USER:
      return {
        targetType,
        targetId,
        userEmailMasked: maskEmail(target.email),
      }
    case AbuseReportTargetType.ORDER:
      return {
        targetType,
        targetId,
        orderId: target.id,
      }
    default:
      return null
  }
}

function toActionDto(action: AbuseReportActionRecord): ReportActionDto {
  return {
    id: action.id,
    reportId: action.reportId,
    adminId: action.adminId,
    adminName: action.admin.name ?? action.admin.email,
    actionType: action.actionType,
    note: action.note,
    metadata:
      action.metadata && typeof action.metadata === 'object' && !Array.isArray(action.metadata)
        ? (action.metadata as Record<string, unknown>)
        : null,
    createdAt: action.createdAt.toISOString(),
  }
}

async function toSummaryDto(report: AbuseReportRecord): Promise<ReportSummaryDto> {
  return {
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    description: report.description,
    status: report.status,
    targetPreview: await buildTargetPreview(report.targetType, report.targetId),
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  }
}

async function toMyReportDto(report: AbuseReportRecord): Promise<MyReportDto> {
  const summary = await toSummaryDto(report)
  return {
    ...summary,
    resolvedAt: report.resolvedAt?.toISOString() ?? null,
    resolutionNote: report.resolutionNote ?? null,
  }
}

async function toDetailDto(report: AbuseReportRecord): Promise<ReportDetailDto> {
  return {
    ...(await toSummaryDto(report)),
    reporter: {
      id: report.reporter.id,
      name:
        report.reporter.profile?.displayName ??
        report.reporter.name ??
        maskEmail(report.reporter.email),
      emailMasked: maskEmail(report.reporter.email),
    },
    assignedAdmin: report.assignedAdmin
      ? {
          id: report.assignedAdmin.id,
          name: report.assignedAdmin.name ?? report.assignedAdmin.email,
        }
      : null,
    resolvedBy: report.resolvedBy
      ? {
          id: report.resolvedBy.id,
          name: report.resolvedBy.name ?? report.resolvedBy.email,
        }
      : null,
    resolvedAt: report.resolvedAt?.toISOString() ?? null,
    resolutionNote: report.resolutionNote ?? null,
    actions: report.actions.map(toActionDto),
  }
}

async function notifyAdminsAboutNewReport(report: AbuseReportRecord): Promise<void> {
  await createAdminNotification({
    title: 'Нова скарга на маркетплейсі',
    message: `Надійшла нова скарга типу ${report.targetType.toLowerCase()} з причиною ${report.reason.toLowerCase()}.`,
    actionUrl: `/admin/reports/${report.id}`,
    metadata: {
      reportId: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
    },
  })
}

async function notifyReporterAboutStatusChange(report: AbuseReportRecord): Promise<void> {
  if (
    report.status !== AbuseReportStatus.RESOLVED &&
    report.status !== AbuseReportStatus.DISMISSED &&
    report.status !== AbuseReportStatus.ESCALATED
  ) {
    return
  }

  const statusMessages: Record<AbuseReportStatus, string> = {
    [AbuseReportStatus.PENDING]: '',
    [AbuseReportStatus.UNDER_REVIEW]: '',
    [AbuseReportStatus.RESOLVED]: 'Вашу скаргу опрацьовано.',
    [AbuseReportStatus.DISMISSED]: 'Скаргу закрито без додаткових дій.',
    [AbuseReportStatus.ESCALATED]: 'Скаргу передано на додатковий розгляд.',
  }

  await notifyUser({
    userId: report.reporterId,
    type: NotificationType.ADMIN_ALERT,
    title: 'Оновлення по вашій скарзі',
    message: statusMessages[report.status],
    actionUrl: '/profile/reports',
    metadata: {
      reportId: report.id,
      status: report.status,
      targetType: report.targetType,
      targetId: report.targetId,
    },
  })
}

async function notifyImpactedUserAboutAction(
  report: AbuseReportRecord,
  actionType: AbuseReportActionType,
): Promise<void> {
  const target = await findReportTargetContext(report.targetType, report.targetId)
  if (!target) {
    return
  }

  let userId: string | null = null
  let message = 'За результатами перевірки було застосовано модераційну дію.'

  switch (target.targetType) {
    case AbuseReportTargetType.PRODUCT:
      userId = target.ownerUserId
      message = `До вашого товару застосовано дію: ${actionType.toLowerCase()}.`
      break
    case AbuseReportTargetType.REVIEW:
      userId = target.reviewUserId
      message = `До вашого відгуку застосовано дію: ${actionType.toLowerCase()}.`
      break
    case AbuseReportTargetType.STORE:
      userId = target.ownerUserId
      message = `До вашого магазину застосовано дію: ${actionType.toLowerCase()}.`
      break
    case AbuseReportTargetType.USER:
      userId = target.id
      message = `До вашого акаунта застосовано дію: ${actionType.toLowerCase()}.`
      break
    case AbuseReportTargetType.ORDER:
      userId = target.orderUserId
      message = `По вашому замовленню зафіксовано модераційну дію: ${actionType.toLowerCase()}.`
      break
  }

  if (!userId) {
    return
  }

  await notifyUser({
    userId,
    type: NotificationType.ADMIN_ALERT,
    title: 'Оновлення по безпеці маркетплейсу',
    message,
    actionUrl: getTargetActionUrl(target),
    metadata: {
      reportId: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      actionType,
    },
  })
}

function assertReporterCanReportTarget(
  reporterId: string,
  target: AbuseReportTargetContext,
): void {
  switch (target.targetType) {
    case AbuseReportTargetType.PRODUCT:
      if (target.ownerUserId === reporterId) {
        throw new AbuseReportOwnershipError('Ви не можете поскаржитися на власний товар.')
      }
      return
    case AbuseReportTargetType.REVIEW:
      if (target.reviewUserId === reporterId || target.storeOwnerId === reporterId) {
        throw new AbuseReportOwnershipError('Ви не можете поскаржитися на власний відгук.')
      }
      return
    case AbuseReportTargetType.STORE:
      if (target.ownerUserId === reporterId) {
        throw new AbuseReportOwnershipError('Ви не можете поскаржитися на власний магазин.')
      }
      return
    case AbuseReportTargetType.USER:
      if (target.id === reporterId) {
        throw new AbuseReportOwnershipError('Ви не можете поскаржитися на власний акаунт.')
      }
      return
    case AbuseReportTargetType.ORDER:
      return
  }
}

function assertReporterCanAccessOrderTarget(
  reporterId: string,
  target: AbuseReportTargetContext,
): void {
  if (target.targetType !== AbuseReportTargetType.ORDER) {
    return
  }

  const isBuyer = target.orderUserId === reporterId
  const isSellerParticipant = target.storeOwners.some((store) => store.ownerId === reporterId)

  if (!isBuyer && !isSellerParticipant) {
    throw new AbuseReportOwnershipError('Ви не можете поскаржитися на чуже замовлення.')
  }
}

function assertReportExists(report: AbuseReportRecord | null): asserts report is AbuseReportRecord {
  if (!report) {
    throw new AbuseReportNotFoundError()
  }
}

async function resolveTargetContextOrThrow(
  targetType: AbuseReportTargetType,
  targetId: string,
): Promise<AbuseReportTargetContext> {
  const target = await findReportTargetContext(targetType, targetId)
  if (!target) {
    throw new AbuseReportTargetNotFoundError()
  }

  return target
}

function deriveStatusAuditAction(
  input: UpdateAbuseReportStatusInput,
): { actionType: AbuseReportActionType; note: string | null } {
  switch (input.status) {
    case AbuseReportStatus.ESCALATED:
      return { actionType: AbuseReportActionType.ESCALATE, note: input.resolutionNote ?? null }
    case AbuseReportStatus.UNDER_REVIEW:
      return { actionType: AbuseReportActionType.NO_ACTION, note: 'Скаргу взято в роботу.' }
    case AbuseReportStatus.RESOLVED:
      return { actionType: AbuseReportActionType.NO_ACTION, note: input.resolutionNote ?? null }
    case AbuseReportStatus.DISMISSED:
      return { actionType: AbuseReportActionType.NO_ACTION, note: input.resolutionNote ?? null }
    case AbuseReportStatus.PENDING:
      return { actionType: AbuseReportActionType.NO_ACTION, note: null }
  }
}

async function applySupportedAbuseAction(
  admin: SessionUser,
  report: AbuseReportRecord,
  input: CreateAbuseReportActionInput,
): Promise<void> {
  switch (input.actionType) {
    case AbuseReportActionType.NO_ACTION:
    case AbuseReportActionType.WARN_USER:
    case AbuseReportActionType.ESCALATE:
      return
    case AbuseReportActionType.HIDE_REVIEW: {
      if (report.targetType !== AbuseReportTargetType.REVIEW) {
        throw new UnsupportedAbuseActionError(
          'Цю дію можна застосовувати тільки до відгуків.',
        )
      }

      await moderateReview(admin, report.targetId, {
        action: 'hide',
        moderationReason: input.note ?? 'Приховано за результатами перевірки скарги.',
      })
      return
    }
    case AbuseReportActionType.REJECT_PRODUCT: {
      if (report.targetType !== AbuseReportTargetType.PRODUCT) {
        throw new UnsupportedAbuseActionError(
          'Цю дію можна застосовувати тільки до товарів.',
        )
      }

      await rejectProduct(
        admin,
        report.targetId,
        input.note ?? 'Відхилено за результатами перевірки скарги.',
      )
      return
    }
    case AbuseReportActionType.ARCHIVE_PRODUCT: {
      if (report.targetType !== AbuseReportTargetType.PRODUCT) {
        throw new UnsupportedAbuseActionError(
          'Цю дію можна застосовувати тільки до товарів.',
        )
      }

      await archiveProduct(
        admin,
        report.targetId,
        input.note ?? 'Архівовано за результатами перевірки скарги.',
      )
      return
    }
    case AbuseReportActionType.SUSPEND_SELLER: {
      const target = await resolveTargetContextOrThrow(report.targetType, report.targetId)
      let targetUserId: string | null = null

      if (target.targetType === AbuseReportTargetType.PRODUCT) {
        targetUserId = target.ownerUserId
      } else if (target.targetType === AbuseReportTargetType.STORE) {
        targetUserId = target.ownerUserId
      } else if (target.targetType === AbuseReportTargetType.USER) {
        targetUserId = target.id
      }

      if (!targetUserId) {
        throw new UnsupportedAbuseActionError(
          'Для цього типу скарги наразі не підтримується призупинення продавця.',
        )
      }

      assertNotSelfModeration(admin.id, targetUserId)

      const sellerProfile = await findSellerProfileByUserId(targetUserId)
      if (!sellerProfile) {
        throw new UnsupportedAbuseActionError(
          'Не вдалося знайти верифікований seller-профіль для цієї дії.',
        )
      }

      await suspendSeller(
        admin,
        sellerProfile.id,
        input.note ?? 'Призупинено за результатами перевірки скарги.',
      )
      return
    }
    case AbuseReportActionType.SUSPEND_STORE: {
      if (report.targetType !== AbuseReportTargetType.STORE) {
        throw new UnsupportedAbuseActionError(
          'Цю дію можна застосовувати тільки до магазинів.',
        )
      }

      await updateStoreActiveState(report.targetId, false)
      return
    }
  }
}

export async function createReport(
  user: SessionUser,
  input: CreateAbuseReportInput,
): Promise<ReportSummaryDto> {
  assertDescriptionQuality(input)

  const target = await resolveTargetContextOrThrow(input.targetType, input.targetId)
  assertReporterCanReportTarget(user.id, target)
  assertReporterCanAccessOrderTarget(user.id, target)

  const existing = await findActiveReportByReporterAndTarget(user.id, input.targetType, input.targetId)
  if (existing) {
    throw new DuplicateAbuseReportError()
  }

  const created = await createAbuseReportRecord({
    reporterId: user.id,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    description: normalizeDescription(input.description),
  })

  void notifyAdminsAboutNewReport(created).catch((error) => {
    logError('abuse-reports:create-report:notify-admins', error)
  })
  void recordAbuseReportCreatedRiskSignals({
    reportId: created.id,
    reporterId: user.id,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    targetContext: target as Parameters<typeof recordAbuseReportCreatedRiskSignals>[0]['targetContext'],
  }).catch((error) => {
    logError('abuse-reports:create-report:risk-signal', error)
  })

  return toSummaryDto(created)
}

export async function getMyReports(
  user: SessionUser,
  query: MyReportsQuery,
): Promise<MyReportListDto> {
  const { items, total } = await listReportsByReporterId(user.id, query)

  return {
    items: await Promise.all(items.map((item) => toMyReportDto(item))),
    total,
    page: query.page,
    limit: query.limit,
  }
}

export async function getAdminReports(
  admin: SessionUser,
  query: AdminReportsQuery,
): Promise<AdminReportQueueDto> {
  assertAdminAccess(admin)
  const { items, total } = await listAdminReports(query)

  return {
    items: await Promise.all(items.map((item) => toSummaryDto(item))),
    total,
    page: query.page,
    limit: query.limit,
  }
}

export async function getAdminReportById(
  admin: SessionUser,
  reportId: string,
): Promise<ReportDetailDto> {
  assertAdminAccess(admin)
  const report = await findAbuseReportById(reportId)
  assertReportExists(report)
  return toDetailDto(report)
}

export async function updateAdminReportStatus(
  admin: SessionUser,
  reportId: string,
  input: UpdateAbuseReportStatusInput,
): Promise<ReportDetailDto> {
  assertAdminAccess(admin)

  const existing = await findAbuseReportById(reportId)
  assertReportExists(existing)

  const isResolvedState =
    input.status === AbuseReportStatus.RESOLVED || input.status === AbuseReportStatus.DISMISSED

  const audit = deriveStatusAuditAction(input)
  const { report } = await updateReportStatusAndCreateAction(
    reportId,
    {
      ...input,
      resolvedAt: isResolvedState ? new Date() : null,
      resolvedById: isResolvedState ? admin.id : null,
    },
    admin.id,
    audit.actionType,
    audit.note,
    {
      assignedAdminId: input.assignedAdminId ?? null,
      status: input.status,
    } satisfies Prisma.InputJsonValue,
  )

  void notifyReporterAboutStatusChange(report).catch((error) => {
    logError('abuse-reports:update-status:notify-reporter', error)
  })

  return toDetailDto(report)
}

export async function addAdminReportAction(
  admin: SessionUser,
  reportId: string,
  input: CreateAbuseReportActionInput,
): Promise<ReportMutationResultDto> {
  assertAdminAccess(admin)

  const report = await findAbuseReportById(reportId)
  assertReportExists(report)

  const action = await createAbuseReportActionRecord(reportId, admin.id, input)

  try {
    await applySupportedAbuseAction(admin, report, input)
  } catch (error) {
    if (error instanceof UnsupportedAbuseActionError) {
      throw error
    }

    throw new AbuseReportModerationError(
      'Не вдалося застосувати модераційну дію до цілі скарги.',
    )
  }

  void notifyImpactedUserAboutAction(report, input.actionType).catch((notificationError) => {
    logError('abuse-reports:add-action:notify-impacted-user', notificationError)
  })

  return {
    reportId,
    action: toActionDto(action),
  }
}
