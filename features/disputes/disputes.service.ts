import {
  DisputeStatus,
  NotificationType,
  UserRole,
} from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import { createAdminNotification, notifyUser } from '@/features/notifications/notifications.service'
import {
  recordDisputeLostRiskSignal,
  recordDisputeOpenedRiskSignal,
} from '@/features/risk/risk.service'
import { requireAdmin, requireBuyer, requireSeller } from '@/lib/auth/guards'
import {
  DisputeEvidenceLimitExceededError,
  DisputeEvidenceUploadError,
  DisputeNotFoundError,
  DisputeOwnershipError,
  DisputeValidationError,
  DuplicateDisputeError,
  InvalidDisputeEvidenceFileError,
  InvalidDisputeTransitionError,
} from '@/lib/errors/dispute'
import { logError } from '@/utils/logger'
import type {
  AdminDisputeListQueryDto,
  CreateDisputeDto,
  CreateDisputeMessageDto,
  DisputeDetailDto,
  DisputeEvidenceDto,
  DisputeListDto,
  DisputeListQueryDto,
  DisputeMessageDto,
  DisputeSummaryDto,
  ResolveDisputeDto,
  UpdateDisputeStatusDto,
} from './disputes.dto'
import {
  countEvidenceByDisputeId,
  createDisputeEvidenceRecord,
  createDisputeMessageRecord,
  createDisputeRecord,
  findActiveDisputeForCreation,
  findDisputeById,
  findOrderDisputeAccessContext,
  listAdminDisputes,
  listBuyerDisputes,
  listSellerDisputes,
  type DisputeRecord,
  updateDisputeStatusRecord,
} from './disputes.repository'
import {
  createSignedDisputeEvidenceUrl,
  removeDisputeEvidenceAsset,
  uploadDisputeEvidenceAsset,
} from './disputes.storage.repository'

const MAX_EVIDENCE_FILES = 5
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024
const ALLOWED_EVIDENCE_TYPES = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['application/pdf', 'pdf'],
])

const ADMIN_STATUS_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  OPEN: [DisputeStatus.UNDER_REVIEW],
  UNDER_REVIEW: [
    DisputeStatus.WAITING_BUYER,
    DisputeStatus.WAITING_SELLER,
    DisputeStatus.ESCALATED,
  ],
  WAITING_BUYER: [DisputeStatus.UNDER_REVIEW, DisputeStatus.ESCALATED],
  WAITING_SELLER: [DisputeStatus.UNDER_REVIEW, DisputeStatus.ESCALATED],
  ESCALATED: [DisputeStatus.UNDER_REVIEW],
  RESOLVED: [],
  REJECTED: [],
  CLOSED: [],
}

const RESOLVABLE_STATUSES = new Set<DisputeStatus>([
  DisputeStatus.UNDER_REVIEW,
  DisputeStatus.WAITING_BUYER,
  DisputeStatus.WAITING_SELLER,
  DisputeStatus.ESCALATED,
])

type DisputeAccessLevel = 'buyer' | 'seller' | 'admin'

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

function runNonBlocking(label: string, task: Promise<unknown>) {
  void task.catch((error) => {
    logError(label, error)
  })
}

function resolvePersonName(person: {
  email?: string | null
  name?: string | null
  profile?: { displayName?: string | null } | null
} | null): string {
  return person?.profile?.displayName ?? person?.name ?? person?.email ?? 'Користувач'
}

function sanitizeFileName(fileName: string, extension: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, '')
  const normalized = baseName
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 80)

  const safeBaseName = normalized || 'evidence'
  return `${safeBaseName}.${extension}`
}

function assertEvidenceFile(file: File): { contentType: string; safeFileName: string } {
  if (!(file instanceof File)) {
    throw new InvalidDisputeEvidenceFileError('A valid dispute evidence file is required')
  }

  if (file.size <= 0) {
    throw new InvalidDisputeEvidenceFileError('Evidence file cannot be empty')
  }

  if (file.size > MAX_EVIDENCE_BYTES) {
    throw new InvalidDisputeEvidenceFileError('Evidence file exceeds the 10MB limit')
  }

  const contentType = file.type.trim().toLowerCase()
  const extension = ALLOWED_EVIDENCE_TYPES.get(contentType)

  if (!extension) {
    throw new InvalidDisputeEvidenceFileError(
      'Only JPG, JPEG, PNG, WEBP, and PDF evidence files are supported',
    )
  }

  return {
    contentType,
    safeFileName: sanitizeFileName(file.name, extension),
  }
}

function getOrderPaymentStatus(record: DisputeRecord): string | null {
  return record.order.payments[0]?.status ?? null
}

function getPrimaryProductName(record: DisputeRecord): string | null {
  return (
    record.orderItem?.productNameSnapshot ??
    record.order.items[0]?.productNameSnapshot ??
    null
  )
}

function getPrimaryStoreName(record: DisputeRecord): string | null {
  return (
    record.store?.name ??
    record.orderItem?.storeNameSnapshot ??
    record.order.items[0]?.storeNameSnapshot ??
    null
  )
}

function getSellerParticipantIds(record: DisputeRecord): string[] {
  const ownerIds = new Set<string>()

  if (record.store?.ownerId) {
    ownerIds.add(record.store.ownerId)
  }
  if (record.orderItem?.store.ownerId) {
    ownerIds.add(record.orderItem.store.ownerId)
  }

  for (const item of record.order.items) {
    if (item.store.ownerId) {
      ownerIds.add(item.store.ownerId)
    }
  }

  return [...ownerIds]
}

function resolveDisputeAccessLevel(user: SessionUser, record: DisputeRecord): DisputeAccessLevel {
  if (user.roles.includes(UserRole.ADMIN)) {
    return 'admin'
  }

  if (record.openedById === user.id) {
    return 'buyer'
  }

  if (getSellerParticipantIds(record).includes(user.id)) {
    return 'seller'
  }

  throw new DisputeOwnershipError()
}

function assertBuyerDisputeScope(user: SessionUser) {
  requireBuyer(user)
}

function assertSellerDisputeScope(user: SessionUser) {
  requireSeller(user)
}

function assertAdminDisputeScope(user: SessionUser) {
  requireAdmin(user)
}

function toDisputeMessageDto(record: {
  id: string
  senderId: string
  message: string
  isInternal: boolean
  createdAt: Date
  sender: {
    email: string | null
    name: string | null
    profile: { displayName: string | null } | null
  }
}): DisputeMessageDto {
  return {
    id: record.id,
    senderId: record.senderId,
    senderName: resolvePersonName(record.sender),
    message: record.message,
    isInternal: record.isInternal,
    createdAt: record.createdAt.toISOString(),
  }
}

async function toDisputeEvidenceDto(record: {
  id: string
  storagePath: string
  fileName: string
  fileType: string
  fileSize: number
  createdAt: Date
}): Promise<DisputeEvidenceDto> {
  try {
    return {
      id: record.id,
      url: await createSignedDisputeEvidenceUrl(record.storagePath),
      fileName: record.fileName,
      fileType: record.fileType,
      fileSize: record.fileSize,
      createdAt: record.createdAt.toISOString(),
    }
  } catch (error) {
    logError('disputes:evidence:url', error)
    throw new DisputeEvidenceUploadError('Unable to access dispute evidence')
  }
}

function toDisputeSummaryDto(record: DisputeRecord): DisputeSummaryDto {
  return {
    id: record.id,
    orderId: record.orderId,
    orderItemId: record.orderItemId,
    storeId: record.storeId,
    reason: record.reason,
    status: record.status,
    priority: record.priority,
    description: record.description,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    orderStatus: record.order.status,
    paymentStatus: getOrderPaymentStatus(record),
    productName: getPrimaryProductName(record),
    storeName: getPrimaryStoreName(record),
  }
}

async function toDisputeDetailDto(
  record: DisputeRecord,
  accessLevel: DisputeAccessLevel,
): Promise<DisputeDetailDto> {
  const messages = record.messages
    .filter((message) => accessLevel === 'admin' || !message.isInternal)
    .map(toDisputeMessageDto)
  const evidence = await Promise.all(record.evidence.map(toDisputeEvidenceDto))

  return {
    ...toDisputeSummaryDto(record),
    openedById: record.openedById,
    respondentId: record.respondentId,
    resolutionNote: record.resolutionNote,
    resolvedById: record.resolvedById,
    resolvedAt: record.resolvedAt?.toISOString() ?? null,
    messages,
    evidence,
  }
}

function assertAdminStatusTransition(current: DisputeStatus, next: DisputeStatus) {
  const allowed = ADMIN_STATUS_TRANSITIONS[current] ?? []
  if (!allowed.includes(next)) {
    throw new InvalidDisputeTransitionError(
      `Cannot change dispute status from ${current} to ${next}`,
    )
  }
}

function assertResolvableStatus(current: DisputeStatus, next: DisputeStatus) {
  if (!RESOLVABLE_STATUSES.has(current)) {
    throw new InvalidDisputeTransitionError(
      `Cannot resolve a dispute from status ${current}`,
    )
  }

  if (
    next !== DisputeStatus.RESOLVED &&
    next !== DisputeStatus.REJECTED &&
    next !== DisputeStatus.CLOSED
  ) {
    throw new InvalidDisputeTransitionError(
      `Cannot resolve a dispute into status ${next}`,
    )
  }
}

function getDisputeByIdOrThrow(record: DisputeRecord | null): DisputeRecord {
  if (!record) {
    throw new DisputeNotFoundError()
  }

  return record
}

function getParticipantNotificationTarget(record: DisputeRecord) {
  const sellerIds = getSellerParticipantIds(record).filter((id) => id !== record.openedById)
  return {
    buyerId: record.openedById,
    sellerIds,
  }
}

function getBuyerActionUrl(record: DisputeRecord): string {
  return buildAppUrl(`/profile/disputes/${record.id}`)
}

function getSellerActionUrl(record: DisputeRecord): string {
  return buildAppUrl(`/seller/disputes/${record.id}`)
}

function getAdminActionUrl(record: DisputeRecord): string {
  return buildAppUrl(`/admin/disputes/${record.id}`)
}

function resolveDisputeActorRole(senderId: string, record: DisputeRecord): 'BUYER' | 'SELLER' | 'ADMIN' {
  if (senderId === record.openedById) {
    return 'BUYER'
  }

  if (getSellerParticipantIds(record).includes(senderId)) {
    return 'SELLER'
  }

  return 'ADMIN'
}

function sendDisputeOpenedNotifications(record: DisputeRecord) {
  const { sellerIds } = getParticipantNotificationTarget(record)

  runNonBlocking(
    'disputes:create:admin-notification',
    createAdminNotification({
      title: 'Нова суперечка по замовленню',
      message: `Покупець ${resolvePersonName(record.openedBy)} відкрив суперечку по замовленню #${record.orderId.slice(0, 8)}.`,
      actionUrl: getAdminActionUrl(record),
      metadata: {
        disputeId: record.id,
        orderId: record.orderId,
        orderItemId: record.orderItemId,
        storeId: record.storeId,
        status: record.status,
        priority: record.priority,
        reason: record.reason,
        roleTarget: 'admin',
        actorRole: 'BUYER',
      },
    }),
  )

  for (const sellerId of sellerIds) {
    runNonBlocking(
      'disputes:create:seller-notification',
      notifyUser({
        userId: sellerId,
        type: NotificationType.ADMIN_ALERT,
        title: 'РќРѕРІР° СЃСѓРїРµСЂРµС‡РєР° РїРѕ Р·Р°РјРѕРІР»РµРЅРЅСЋ',
        message: `РџРѕ Р·Р°РјРѕРІР»РµРЅРЅСЋ #${record.orderId.slice(0, 8)} РІС–РґРєСЂРёС‚Рѕ РЅРѕРІСѓ СЃСѓРїРµСЂРµС‡РєСѓ.`,
        actionUrl: getSellerActionUrl(record),
        metadata: {
          disputeId: record.id,
          orderId: record.orderId,
          orderItemId: record.orderItemId,
          storeId: record.storeId,
          status: record.status,
          priority: record.priority,
          reason: record.reason,
          roleTarget: 'seller',
          actorRole: 'BUYER',
        },
      }),
    )
  }
}

function sendDisputeStatusChangedNotifications(record: DisputeRecord) {
  const { buyerId, sellerIds } = getParticipantNotificationTarget(record)
  const message = `Статус суперечки по замовленню #${record.orderId.slice(0, 8)} змінено на ${record.status}.`

  runNonBlocking(
    'disputes:status:buyer-notification',
    notifyUser({
      userId: buyerId,
      type: NotificationType.ADMIN_ALERT,
      title: 'Оновлення суперечки',
      message,
      actionUrl: getBuyerActionUrl(record),
      metadata: {
        disputeId: record.id,
        orderId: record.orderId,
        status: record.status,
        resolutionNote: record.resolutionNote,
        roleTarget: 'buyer',
        actorRole: 'ADMIN',
      },
    }),
  )

  for (const sellerId of sellerIds) {
    runNonBlocking(
      'disputes:status:seller-notification',
      notifyUser({
        userId: sellerId,
        type: NotificationType.ADMIN_ALERT,
        title: 'Оновлення суперечки',
        message,
        actionUrl: getSellerActionUrl(record),
        metadata: {
          disputeId: record.id,
          orderId: record.orderId,
          storeId: record.storeId,
          status: record.status,
          resolutionNote: record.resolutionNote,
          roleTarget: 'seller',
          actorRole: 'ADMIN',
        },
      }),
    )
  }
}

function sendVisibleMessageNotifications(record: DisputeRecord, senderId: string) {
  const { buyerId, sellerIds } = getParticipantNotificationTarget(record)
  const actorRole = resolveDisputeActorRole(senderId, record)
  const visibleRecipients = new Set<string>()

  if (senderId !== buyerId) {
    visibleRecipients.add(buyerId)
  }

  for (const sellerId of sellerIds) {
    if (sellerId !== senderId) {
      visibleRecipients.add(sellerId)
    }
  }

  if (actorRole !== 'ADMIN') {
    runNonBlocking(
      'disputes:message:admin-notification',
      createAdminNotification({
        title: 'РќРѕРІРµ РїРѕРІС–РґРѕРјР»РµРЅРЅСЏ Сѓ СЃСѓРїРµСЂРµС‡С†С–',
        message: `РЈ СЃСѓРїРµСЂРµС‡С†С– РїРѕ Р·Р°РјРѕРІР»РµРЅРЅСЋ #${record.orderId.slice(0, 8)} Р·вЂ™СЏРІРёР»РѕСЃСЏ РЅРѕРІРµ РїРѕРІС–РґРѕРјР»РµРЅРЅСЏ.`,
        actionUrl: getAdminActionUrl(record),
        metadata: {
          disputeId: record.id,
          orderId: record.orderId,
          storeId: record.storeId,
          status: record.status,
          senderId,
          roleTarget: 'admin',
          actorRole,
        },
      }),
    )
  }

  for (const recipientId of visibleRecipients) {
    const isBuyerRecipient = recipientId === buyerId
    runNonBlocking(
      'disputes:message:notification',
      notifyUser({
        userId: recipientId,
        type: NotificationType.ADMIN_ALERT,
        title: 'Нове повідомлення у суперечці',
        message: `У суперечці по замовленню #${record.orderId.slice(0, 8)} з’явилося нове повідомлення.`,
        actionUrl: isBuyerRecipient ? getBuyerActionUrl(record) : getSellerActionUrl(record),
        metadata: {
          disputeId: record.id,
          orderId: record.orderId,
          status: record.status,
          senderId,
          roleTarget: isBuyerRecipient ? 'buyer' : 'seller',
          actorRole,
        },
      }),
    )
  }
}

export async function createDispute(
  user: SessionUser,
  input: CreateDisputeDto,
): Promise<DisputeDetailDto> {
  assertBuyerDisputeScope(user)

  const orderContext = await findOrderDisputeAccessContext({
    orderId: input.orderId,
    orderItemId: input.orderItemId ?? null,
    userId: user.id,
  })

  if (!orderContext) {
    throw new DisputeOwnershipError('You can open disputes only for your own order items')
  }

  if (!orderContext.orderItemId && !orderContext.storeId) {
    throw new DisputeValidationError(
      'Select a specific order item before opening a dispute for a multi-store order',
    )
  }

  const existingDispute = await findActiveDisputeForCreation({
    orderId: input.orderId,
    orderItemId: input.orderItemId ?? null,
    openedById: user.id,
  })
  if (existingDispute) {
    throw new DuplicateDisputeError()
  }

  const created = await createDisputeRecord({
    orderId: input.orderId,
    orderItemId: input.orderItemId ?? null,
    openedById: user.id,
    respondentId: orderContext.storeOwnerId,
    storeId: orderContext.storeId,
    reason: input.reason,
    priority: input.priority,
    description: input.description,
    status: DisputeStatus.OPEN,
  })

  sendDisputeOpenedNotifications(created)
  runNonBlocking(
    'disputes:create:risk-signal',
    recordDisputeOpenedRiskSignal({
      disputeId: created.id,
      respondentId: created.respondentId,
      storeId: created.storeId,
      orderId: created.orderId,
      reason: created.reason,
      priority: created.priority,
    }),
  )

  return toDisputeDetailDto(created, 'buyer')
}

export async function getDisputes(
  user: SessionUser,
  query: DisputeListQueryDto,
): Promise<DisputeListDto> {
  if (query.scope === 'seller') {
    assertSellerDisputeScope(user)
    const result = await listSellerDisputes(user.id, query)
    return {
      items: result.items.map(toDisputeSummaryDto),
      page: query.page,
      limit: query.limit,
      total: result.total,
    }
  }

  assertBuyerDisputeScope(user)
  const result = await listBuyerDisputes(user.id, query)
  return {
    items: result.items.map(toDisputeSummaryDto),
    page: query.page,
    limit: query.limit,
    total: result.total,
  }
}

export async function getDisputeById(
  user: SessionUser,
  id: string,
): Promise<DisputeDetailDto> {
  const record = getDisputeByIdOrThrow(await findDisputeById(id))
  const accessLevel = resolveDisputeAccessLevel(user, record)

  if (accessLevel === 'seller') {
    assertSellerDisputeScope(user)
  } else if (accessLevel === 'buyer') {
    assertBuyerDisputeScope(user)
  } else {
    assertAdminDisputeScope(user)
  }

  return toDisputeDetailDto(record, accessLevel)
}

export async function addDisputeMessage(
  user: SessionUser,
  id: string,
  input: CreateDisputeMessageDto,
): Promise<DisputeMessageDto> {
  const record = getDisputeByIdOrThrow(await findDisputeById(id))
  const accessLevel = resolveDisputeAccessLevel(user, record)

  if (input.isInternal && accessLevel !== 'admin') {
    throw new DisputeOwnershipError('Only admins can add internal dispute notes')
  }

  const message = await createDisputeMessageRecord({
    disputeId: id,
    senderId: user.id,
    message: input.message,
    isInternal: Boolean(input.isInternal),
  })

  if (!message.isInternal) {
    sendVisibleMessageNotifications(record, user.id)
  }

  return toDisputeMessageDto(message)
}

export async function uploadDisputeEvidence(
  user: SessionUser,
  id: string,
  file: File,
): Promise<DisputeEvidenceDto> {
  const record = getDisputeByIdOrThrow(await findDisputeById(id))
  resolveDisputeAccessLevel(user, record)

  const currentCount = await countEvidenceByDisputeId(id)
  if (currentCount >= MAX_EVIDENCE_FILES) {
    throw new DisputeEvidenceLimitExceededError(
      `A dispute can have at most ${MAX_EVIDENCE_FILES} evidence files`,
    )
  }

  const validatedFile = assertEvidenceFile(file)
  const evidenceId = crypto.randomUUID()
  const storagePath = `disputes/${id}/${evidenceId}-${validatedFile.safeFileName}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  await uploadDisputeEvidenceAsset({
    storagePath,
    body: bytes,
    contentType: validatedFile.contentType,
  })

  let evidenceRecord: Awaited<ReturnType<typeof createDisputeEvidenceRecord>>
  try {
    evidenceRecord = await createDisputeEvidenceRecord({
      id: evidenceId,
      disputeId: id,
      uploadedById: user.id,
      storagePath,
      fileName: validatedFile.safeFileName,
      fileType: validatedFile.contentType,
      fileSize: file.size,
    })
  } catch (error) {
    try {
      await removeDisputeEvidenceAsset(storagePath)
    } catch (cleanupError) {
      logError('disputes:evidence:cleanup', cleanupError)
    }

    if (error instanceof Error) {
      throw error
    }

    throw new DisputeEvidenceUploadError()
  }

  return toDisputeEvidenceDto(evidenceRecord)
}

export async function getAdminDisputes(
  user: SessionUser,
  query: AdminDisputeListQueryDto,
): Promise<DisputeListDto> {
  assertAdminDisputeScope(user)

  const result = await listAdminDisputes(query)
  return {
    items: result.items.map(toDisputeSummaryDto),
    page: query.page,
    limit: query.limit,
    total: result.total,
  }
}

export async function getAdminDisputeById(
  user: SessionUser,
  id: string,
): Promise<DisputeDetailDto> {
  assertAdminDisputeScope(user)
  const record = getDisputeByIdOrThrow(await findDisputeById(id))
  return toDisputeDetailDto(record, 'admin')
}

export async function updateAdminDisputeStatus(
  user: SessionUser,
  id: string,
  input: UpdateDisputeStatusDto,
): Promise<DisputeDetailDto> {
  assertAdminDisputeScope(user)
  const record = getDisputeByIdOrThrow(await findDisputeById(id))

  assertAdminStatusTransition(record.status, input.status)

  const updated = await updateDisputeStatusRecord({
    id,
    status: input.status,
    resolutionNote: null,
    resolvedAt: null,
    resolvedById: null,
  })

  sendDisputeStatusChangedNotifications(updated)

  return toDisputeDetailDto(updated, 'admin')
}

export async function resolveAdminDispute(
  user: SessionUser,
  id: string,
  input: ResolveDisputeDto,
): Promise<DisputeDetailDto> {
  assertAdminDisputeScope(user)
  const record = getDisputeByIdOrThrow(await findDisputeById(id))

  assertResolvableStatus(record.status, input.status)

  const updated = await updateDisputeStatusRecord({
    id,
    status: input.status,
    resolutionNote: input.resolutionNote,
    resolvedAt: new Date(),
    resolvedById: user.id,
  })

  sendDisputeStatusChangedNotifications(updated)
  if (updated.status === DisputeStatus.RESOLVED) {
    runNonBlocking(
      'disputes:resolve:risk-signal',
      recordDisputeLostRiskSignal({
        disputeId: updated.id,
        respondentId: updated.respondentId,
        storeId: updated.storeId,
        orderId: updated.orderId,
        status: updated.status,
        resolutionNote: updated.resolutionNote,
      }),
    )
  }

  return toDisputeDetailDto(updated, 'admin')
}
