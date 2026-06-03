import Decimal from 'decimal.js'
import {
  RiskLevel,
  RiskSignalType,
  type Prisma,
} from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import { createAdminNotification } from '@/features/notifications/notifications.service'
import { requireAdmin } from '@/lib/auth/guards'
import {
  RiskProfileNotFoundError,
  RiskSubjectNotFoundError,
  RiskValidationError,
} from '@/lib/errors/risk'
import { logError } from '@/utils/logger'
import type {
  RecordRiskSignalInput,
  RiskEntityType,
  RiskProfileDetailDto,
  RiskProfileListDto,
  RiskProfileListItemDto,
  RiskProfileQueryDto,
  RiskRecalculationResultDto,
  RiskRecalculateRequestDto,
  RiskSignalDto,
  RiskStorePreviewDto,
  RiskUserPreviewDto,
} from './risk.dto'
import {
  countStoreRiskProfiles,
  countUserRiskProfiles,
  createRiskSignalRecord,
  findExistingRiskSignal,
  findRiskProfileByStoreId,
  findRiskProfileByUserId,
  findRiskStoreSubjectById,
  findRiskUserSubjectById,
  listRiskSignalsByStoreId,
  listRiskSignalsByUserId,
  listRiskStoreIdsForRecalculation,
  listRiskUserIdsForRecalculation,
  listStoreRiskProfiles,
  listStoresByOwnerId,
  listUserRiskProfiles,
  type RiskProfileRecord,
  type RiskSignalRecord,
  upsertStoreRiskProfile,
  upsertUserRiskProfile,
} from './risk.repository'

const RISK_SIGNAL_WEIGHTS: Record<RiskSignalType, Decimal> = {
  ABUSE_REPORT_CREATED: new Decimal(10),
  DISPUTE_OPENED: new Decimal(15),
  DISPUTE_LOST: new Decimal(25),
  PAYMENT_FAILED: new Decimal(8),
  REFUND_ISSUED: new Decimal(20),
  PRODUCT_REJECTED: new Decimal(18),
  SELLER_SUSPENDED: new Decimal(45),
  REVIEW_HIDDEN: new Decimal(12),
  ORDER_CANCELLED: new Decimal(6),
}

const RISK_LEVEL_THRESHOLDS = {
  MEDIUM: new Decimal(20),
  HIGH: new Decimal(50),
  CRITICAL: new Decimal(80),
} as const

function runNonBlocking(label: string, task: Promise<unknown>) {
  void task.catch((error) => {
    logError(label, error)
  })
}

function buildAppUrl(path: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!appUrl) {
    return path
  }

  try {
    return new URL(path, appUrl.endsWith('/') ? appUrl : `${appUrl}/`).toString()
  } catch {
    return path
  }
}

function assertAdminUser(user: SessionUser) {
  requireAdmin(user)
}

function assertHasRiskTarget(input: { userId?: string | null; storeId?: string | null }) {
  if (!input.userId && !input.storeId) {
    throw new RiskValidationError('A risk signal must target a user, a store, or both')
  }
}

function normalizeMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null
  }

  return metadata as Record<string, unknown>
}

function toRiskUserPreview(profile: RiskProfileRecord): RiskUserPreviewDto | null {
  if (!profile.user) {
    return null
  }

  return {
    id: profile.user.id,
    email: profile.user.email,
    name: profile.user.name,
    displayName: profile.user.profile?.displayName ?? null,
    roles: profile.user.roles.map((role) => role.role),
  }
}

function toRiskStorePreview(profile: RiskProfileRecord): RiskStorePreviewDto | null {
  if (!profile.store) {
    return null
  }

  return {
    id: profile.store.id,
    name: profile.store.name,
    slug: profile.store.slug,
    owner: {
      id: profile.store.owner.id,
      email: profile.store.owner.email,
      name: profile.store.owner.name,
      displayName: profile.store.owner.profile?.displayName ?? null,
    },
  }
}

function toRiskSignalDto(signal: RiskSignalRecord): RiskSignalDto {
  return {
    id: signal.id,
    userId: signal.userId,
    storeId: signal.storeId,
    sourceType: signal.sourceType,
    sourceId: signal.sourceId,
    signalType: signal.signalType,
    weight: signal.weight.toString(),
    metadata: normalizeMetadata(signal.metadata),
    createdAt: signal.createdAt.toISOString(),
  }
}

function toRiskProfileListItemDto(profile: RiskProfileRecord): RiskProfileListItemDto {
  return {
    id: profile.id,
    userId: profile.userId,
    storeId: profile.storeId,
    score: profile.score.toString(),
    level: profile.level,
    lastCalculatedAt: profile.lastCalculatedAt?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    user: toRiskUserPreview(profile),
    store: toRiskStorePreview(profile),
  }
}

function toRiskProfileDetailDto(
  profile: RiskProfileRecord,
  signals: RiskSignalRecord[],
): RiskProfileDetailDto {
  return {
    ...toRiskProfileListItemDto(profile),
    signals: signals.map(toRiskSignalDto),
  }
}

function resolveRiskLevel(score: Decimal): RiskLevel {
  if (score.greaterThanOrEqualTo(RISK_LEVEL_THRESHOLDS.CRITICAL)) {
    return RiskLevel.CRITICAL
  }

  if (score.greaterThanOrEqualTo(RISK_LEVEL_THRESHOLDS.HIGH)) {
    return RiskLevel.HIGH
  }

  if (score.greaterThanOrEqualTo(RISK_LEVEL_THRESHOLDS.MEDIUM)) {
    return RiskLevel.MEDIUM
  }

  return RiskLevel.LOW
}

function sumSignalWeights(signals: RiskSignalRecord[]): Decimal {
  return signals.reduce((total, signal) => total.plus(new Decimal(signal.weight.toString())), new Decimal(0))
}

async function maybeNotifyAdminsAboutCriticalRisk(input: {
  targetType: RiskEntityType
  targetId: string
  previousLevel: RiskLevel | null
  profile: RiskProfileRecord
}) {
  if (input.previousLevel === RiskLevel.CRITICAL || input.profile.level !== RiskLevel.CRITICAL) {
    return
  }

  const subjectLabel =
    input.targetType === 'USER'
      ? input.profile.user?.email ?? input.profile.user?.name ?? input.targetId
      : input.profile.store?.name ?? input.targetId

  await createAdminNotification({
    title: 'Критичний ризик-профіль',
    message:
      input.targetType === 'USER'
        ? `Користувач ${subjectLabel} досяг критичного рівня ризику.`
        : `Магазин ${subjectLabel} досяг критичного рівня ризику.`,
    actionUrl: buildAppUrl(
      input.targetType === 'USER'
        ? `/admin/risk/users/${input.targetId}`
        : `/admin/risk/stores/${input.targetId}`,
    ),
    metadata: {
      targetType: input.targetType,
      targetId: input.targetId,
      profileId: input.profile.id,
      score: input.profile.score.toString(),
      level: input.profile.level,
    },
  })
}

async function ensureRiskUserExists(userId: string) {
  const subject = await findRiskUserSubjectById(userId)
  if (!subject) {
    throw new RiskSubjectNotFoundError('Risk user subject not found')
  }
  return subject
}

async function ensureRiskStoreExists(storeId: string) {
  const subject = await findRiskStoreSubjectById(storeId)
  if (!subject) {
    throw new RiskSubjectNotFoundError('Risk store subject not found')
  }
  return subject
}

async function recalculateUserRiskProfileInternal(userId: string): Promise<RiskProfileDetailDto> {
  await ensureRiskUserExists(userId)

  const [existing, signals] = await Promise.all([
    findRiskProfileByUserId(userId),
    listRiskSignalsByUserId(userId),
  ])
  const score = sumSignalWeights(signals)
  const level = resolveRiskLevel(score)
  const updated = await upsertUserRiskProfile({
    userId,
    score: new Decimal(score.toFixed(2)),
    level,
    lastCalculatedAt: new Date(),
  })

  runNonBlocking(
    'risk:critical-user-notification',
    maybeNotifyAdminsAboutCriticalRisk({
      targetType: 'USER',
      targetId: userId,
      previousLevel: existing?.level ?? null,
      profile: updated,
    }),
  )

  return toRiskProfileDetailDto(updated, signals)
}

async function recalculateStoreRiskProfileInternal(storeId: string): Promise<RiskProfileDetailDto> {
  await ensureRiskStoreExists(storeId)

  const [existing, signals] = await Promise.all([
    findRiskProfileByStoreId(storeId),
    listRiskSignalsByStoreId(storeId),
  ])
  const score = sumSignalWeights(signals)
  const level = resolveRiskLevel(score)
  const updated = await upsertStoreRiskProfile({
    storeId,
    score: new Decimal(score.toFixed(2)),
    level,
    lastCalculatedAt: new Date(),
  })

  runNonBlocking(
    'risk:critical-store-notification',
    maybeNotifyAdminsAboutCriticalRisk({
      targetType: 'STORE',
      targetId: storeId,
      previousLevel: existing?.level ?? null,
      profile: updated,
    }),
  )

  return toRiskProfileDetailDto(updated, signals)
}

export async function recordRiskSignal(input: RecordRiskSignalInput) {
  assertHasRiskTarget(input)

  const weight =
    input.weight !== undefined
      ? new Decimal(input.weight)
      : RISK_SIGNAL_WEIGHTS[input.signalType]

  const existing = await findExistingRiskSignal({
    userId: input.userId ?? null,
    storeId: input.storeId ?? null,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    signalType: input.signalType,
  })

  if (existing) {
    return {
      signal: toRiskSignalDto(existing),
      duplicate: true,
    }
  }

  const created = await createRiskSignalRecord({
    userId: input.userId ?? null,
    storeId: input.storeId ?? null,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    signalType: input.signalType,
    weight: new Decimal(weight.toFixed(2)),
    metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
  })

  if (input.userId) {
    await recalculateUserRiskProfileInternal(input.userId)
  }
  if (input.storeId) {
    await recalculateStoreRiskProfileInternal(input.storeId)
  }

  return {
    signal: toRiskSignalDto(created),
    duplicate: false,
  }
}

export async function recalculateRiskProfile(input: {
  userId?: string | null
  storeId?: string | null
}): Promise<RiskProfileDetailDto> {
  assertHasRiskTarget(input)

  if (input.userId && input.storeId) {
    throw new RiskValidationError('Recalculate one risk profile target at a time')
  }

  if (input.userId) {
    return recalculateUserRiskProfileInternal(input.userId)
  }

  return recalculateStoreRiskProfileInternal(input.storeId!)
}

export async function recordAbuseReportCreatedRiskSignals(input: {
  reportId: string
  reporterId: string
  targetType: string
  targetId: string
  reason: string
  targetContext:
    | {
        targetType: 'PRODUCT'
        ownerUserId: string
        storeId: string
      }
    | {
        targetType: 'REVIEW'
        reviewUserId: string
        storeId: string
      }
    | {
        targetType: 'STORE'
        ownerUserId: string
        id: string
      }
    | {
        targetType: 'USER'
        id: string
      }
    | {
        targetType: 'ORDER'
        orderUserId: string
        storeOwners: Array<{ storeId: string; ownerId: string }>
      }
}) {
  const commonMetadata = {
    reportId: input.reportId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
  }

  switch (input.targetContext.targetType) {
    case 'PRODUCT':
      await recordRiskSignal({
        userId: input.targetContext.ownerUserId,
        storeId: input.targetContext.storeId,
        sourceType: 'ABUSE_REPORT',
        sourceId: input.reportId,
        signalType: RiskSignalType.ABUSE_REPORT_CREATED,
        metadata: commonMetadata,
      })
      return
    case 'REVIEW':
      await recordRiskSignal({
        userId: input.targetContext.reviewUserId,
        storeId: input.targetContext.storeId,
        sourceType: 'ABUSE_REPORT',
        sourceId: input.reportId,
        signalType: RiskSignalType.ABUSE_REPORT_CREATED,
        metadata: commonMetadata,
      })
      return
    case 'STORE':
      await recordRiskSignal({
        userId: input.targetContext.ownerUserId,
        storeId: input.targetContext.id,
        sourceType: 'ABUSE_REPORT',
        sourceId: input.reportId,
        signalType: RiskSignalType.ABUSE_REPORT_CREATED,
        metadata: commonMetadata,
      })
      return
    case 'USER':
      await recordRiskSignal({
        userId: input.targetContext.id,
        sourceType: 'ABUSE_REPORT',
        sourceId: input.reportId,
        signalType: RiskSignalType.ABUSE_REPORT_CREATED,
        metadata: commonMetadata,
      })
      return
    case 'ORDER':
      if (input.targetContext.orderUserId === input.reporterId) {
        await Promise.all(
          input.targetContext.storeOwners.map((storeOwner) =>
            recordRiskSignal({
              userId: storeOwner.ownerId,
              storeId: storeOwner.storeId,
              sourceType: 'ABUSE_REPORT',
              sourceId: `${input.reportId}:${storeOwner.storeId}`,
              signalType: RiskSignalType.ABUSE_REPORT_CREATED,
              metadata: commonMetadata,
            }),
          ),
        )
      } else {
        await recordRiskSignal({
          userId: input.targetContext.orderUserId,
          sourceType: 'ABUSE_REPORT',
          sourceId: input.reportId,
          signalType: RiskSignalType.ABUSE_REPORT_CREATED,
          metadata: commonMetadata,
        })
      }
  }
}

export async function recordDisputeOpenedRiskSignal(input: {
  disputeId: string
  respondentId?: string | null
  storeId?: string | null
  orderId: string
  reason: string
  priority: string
}) {
  if (!input.respondentId && !input.storeId) {
    return null
  }

  return recordRiskSignal({
    userId: input.respondentId ?? null,
    storeId: input.storeId ?? null,
    sourceType: 'DISPUTE',
    sourceId: input.disputeId,
    signalType: RiskSignalType.DISPUTE_OPENED,
    metadata: {
      disputeId: input.disputeId,
      orderId: input.orderId,
      reason: input.reason,
      priority: input.priority,
    },
  })
}

export async function recordDisputeLostRiskSignal(input: {
  disputeId: string
  respondentId?: string | null
  storeId?: string | null
  orderId: string
  status: string
  resolutionNote?: string | null
}) {
  if (!input.respondentId && !input.storeId) {
    return null
  }

  return recordRiskSignal({
    userId: input.respondentId ?? null,
    storeId: input.storeId ?? null,
    sourceType: 'DISPUTE',
    sourceId: `${input.disputeId}:resolved`,
    signalType: RiskSignalType.DISPUTE_LOST,
    metadata: {
      disputeId: input.disputeId,
      orderId: input.orderId,
      status: input.status,
      resolutionNote: input.resolutionNote ?? null,
    },
  })
}

export async function recordPaymentFailedRiskSignal(input: {
  paymentId: string
  userId: string
  orderId: string
  paymentMethod: string
  paymentProvider: string
}) {
  return recordRiskSignal({
    userId: input.userId,
    sourceType: 'PAYMENT',
    sourceId: input.paymentId,
    signalType: RiskSignalType.PAYMENT_FAILED,
    metadata: {
      paymentId: input.paymentId,
      orderId: input.orderId,
      paymentMethod: input.paymentMethod,
      paymentProvider: input.paymentProvider,
    },
  })
}

export async function recordRefundIssuedRiskSignals(input: {
  refundId: string
  orderId: string
  amount: string
  reason?: string | null
  stores: Array<{ storeId: string; ownerId: string }>
}) {
  const uniqueStores = new Map<string, { storeId: string; ownerId: string }>()
  for (const store of input.stores) {
    if (!uniqueStores.has(store.storeId)) {
      uniqueStores.set(store.storeId, store)
    }
  }

  return Promise.all(
    [...uniqueStores.values()].map((store) =>
      recordRiskSignal({
        userId: store.ownerId,
        storeId: store.storeId,
        sourceType: 'REFUND',
        sourceId: `${input.refundId}:${store.storeId}`,
        signalType: RiskSignalType.REFUND_ISSUED,
        metadata: {
          refundId: input.refundId,
          orderId: input.orderId,
          amount: input.amount,
          reason: input.reason ?? null,
        },
      }),
    ),
  )
}

export async function recordProductRejectedRiskSignal(input: {
  productId: string
  ownerUserId: string
  storeId: string
  reason: string
}) {
  return recordRiskSignal({
    userId: input.ownerUserId,
    storeId: input.storeId,
    sourceType: 'PRODUCT',
    sourceId: input.productId,
    signalType: RiskSignalType.PRODUCT_REJECTED,
    metadata: {
      productId: input.productId,
      reason: input.reason,
    },
  })
}

export async function recordSellerSuspensionRiskSignals(input: {
  sellerUserId: string
  sellerId: string
  reason: string
}) {
  const stores = await listStoresByOwnerId(input.sellerUserId)

  const results = [
    await recordRiskSignal({
      userId: input.sellerUserId,
      sourceType: 'SELLER_MODERATION',
      sourceId: input.sellerId,
      signalType: RiskSignalType.SELLER_SUSPENDED,
      metadata: {
        sellerId: input.sellerId,
        reason: input.reason,
      },
    }),
  ]

  const storeSignals = await Promise.all(
    stores.map((store) =>
      recordRiskSignal({
        userId: input.sellerUserId,
        storeId: store.id,
        sourceType: 'SELLER_MODERATION',
        sourceId: `${input.sellerId}:${store.id}`,
        signalType: RiskSignalType.SELLER_SUSPENDED,
        metadata: {
          sellerId: input.sellerId,
          storeId: store.id,
          storeName: store.name,
          reason: input.reason,
        },
      }),
    ),
  )

  return [...results, ...storeSignals]
}

export async function recordReviewHiddenRiskSignal(input: {
  reviewId: string
  reviewerUserId: string
  storeId: string
  productId: string
  reason?: string | null
}) {
  return recordRiskSignal({
    userId: input.reviewerUserId,
    storeId: input.storeId,
    sourceType: 'REVIEW',
    sourceId: input.reviewId,
    signalType: RiskSignalType.REVIEW_HIDDEN,
    metadata: {
      reviewId: input.reviewId,
      productId: input.productId,
      reason: input.reason ?? null,
    },
  })
}

export async function getAdminUserRiskProfiles(
  user: SessionUser,
  query: RiskProfileQueryDto,
): Promise<RiskProfileListDto> {
  assertAdminUser(user)
  const [items, total] = await Promise.all([
    listUserRiskProfiles(query),
    countUserRiskProfiles(query),
  ])

  return {
    items: items.map(toRiskProfileListItemDto),
    page: query.page,
    limit: query.limit,
    total,
  }
}

export async function getAdminStoreRiskProfiles(
  user: SessionUser,
  query: RiskProfileQueryDto,
): Promise<RiskProfileListDto> {
  assertAdminUser(user)
  const [items, total] = await Promise.all([
    listStoreRiskProfiles(query),
    countStoreRiskProfiles(query),
  ])

  return {
    items: items.map(toRiskProfileListItemDto),
    page: query.page,
    limit: query.limit,
    total,
  }
}

export async function getAdminUserRiskProfileById(
  user: SessionUser,
  userId: string,
): Promise<RiskProfileDetailDto> {
  assertAdminUser(user)
  const profile = await findRiskProfileByUserId(userId)
  if (profile) {
    return toRiskProfileDetailDto(profile, await listRiskSignalsByUserId(userId))
  }

  return recalculateUserRiskProfileInternal(userId)
}

export async function getAdminStoreRiskProfileById(
  user: SessionUser,
  storeId: string,
): Promise<RiskProfileDetailDto> {
  assertAdminUser(user)
  const profile = await findRiskProfileByStoreId(storeId)
  if (profile) {
    return toRiskProfileDetailDto(profile, await listRiskSignalsByStoreId(storeId))
  }

  return recalculateStoreRiskProfileInternal(storeId)
}

export async function recalculateAdminRiskProfiles(
  user: SessionUser,
  input: RiskRecalculateRequestDto,
): Promise<RiskRecalculationResultDto> {
  assertAdminUser(user)

  if (input.targetType === 'USER') {
    const profile = await recalculateUserRiskProfileInternal(input.targetId!)
    return {
      processed: 1,
      items: [{
        targetType: 'USER',
        targetId: input.targetId!,
        profileId: profile.id,
        score: profile.score,
        level: profile.level,
      }],
    }
  }

  if (input.targetType === 'STORE') {
    const profile = await recalculateStoreRiskProfileInternal(input.targetId!)
    return {
      processed: 1,
      items: [{
        targetType: 'STORE',
        targetId: input.targetId!,
        profileId: profile.id,
        score: profile.score,
        level: profile.level,
      }],
    }
  }

  const [userIds, storeIds] = await Promise.all([
    listRiskUserIdsForRecalculation(),
    listRiskStoreIdsForRecalculation(),
  ])

  const userProfiles = await Promise.all(userIds.map((id) => recalculateUserRiskProfileInternal(id)))
  const storeProfiles = await Promise.all(storeIds.map((id) => recalculateStoreRiskProfileInternal(id)))

  return {
    processed: userProfiles.length + storeProfiles.length,
    items: [
      ...userProfiles.map((profile) => ({
        targetType: 'USER' as const,
        targetId: profile.userId!,
        profileId: profile.id,
        score: profile.score,
        level: profile.level,
      })),
      ...storeProfiles.map((profile) => ({
        targetType: 'STORE' as const,
        targetId: profile.storeId!,
        profileId: profile.id,
        score: profile.score,
        level: profile.level,
      })),
    ],
  }
}

export async function getRiskProfileByTarget(
  targetType: RiskEntityType,
  targetId: string,
): Promise<RiskProfileDetailDto> {
  if (targetType === 'USER') {
    const profile = await findRiskProfileByUserId(targetId)
    if (!profile) {
      throw new RiskProfileNotFoundError()
    }

    return toRiskProfileDetailDto(profile, await listRiskSignalsByUserId(targetId))
  }

  const profile = await findRiskProfileByStoreId(targetId)
  if (!profile) {
    throw new RiskProfileNotFoundError()
  }

  return toRiskProfileDetailDto(profile, await listRiskSignalsByStoreId(targetId))
}

export const riskScoringConfig = {
  weights: Object.fromEntries(
    Object.entries(RISK_SIGNAL_WEIGHTS).map(([signalType, weight]) => [signalType, weight.toFixed(2)]),
  ),
  thresholds: {
    medium: RISK_LEVEL_THRESHOLDS.MEDIUM.toFixed(2),
    high: RISK_LEVEL_THRESHOLDS.HIGH.toFixed(2),
    critical: RISK_LEVEL_THRESHOLDS.CRITICAL.toFixed(2),
  },
} as const
