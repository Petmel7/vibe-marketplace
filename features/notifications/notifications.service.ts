import { NotificationType, type Notification } from '@/app/generated/prisma/client'
import { NotificationNotFoundError, NotificationOwnershipError } from '@/lib/errors/notification'
import type { SessionUser } from '@/features/auth/auth.dto'
import type {
  CreateAdminNotificationInput,
  CreateNotificationInput,
  CreateTypedNotificationInput,
  NotificationDto,
  NotificationListDto,
  NotificationMutationResultDto,
  NotificationQueryDto,
  NotificationRealtimeChannelDto,
  NotificationRealtimePayloadDto,
  NotificationUnreadCountDto,
} from './notifications.dto'
import {
  countNotificationsByUserId,
  countUnreadNotificationsByUserId,
  createManyNotifications,
  createNotification,
  deleteNotificationById,
  findAdminNotificationRecipients,
  findNotificationById,
  findSellerNewOrderNotificationByDedupeKey,
  markAllNotificationsReadByUserId,
  markNotificationRead,
  type NotificationListRecord,
  type NotificationOwnershipRecord,
  listNotificationsByUserId,
} from './notifications.repository'
import { logInfo, logWarn } from '@/utils/logger'

function toMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null
  }

  return metadata as Record<string, unknown>
}

function toNotificationDto(
  notification: NotificationListRecord | Notification,
): NotificationDto {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    actionUrl: notification.actionUrl,
    metadata: toMetadata(notification.metadata),
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
    updatedAt: notification.updatedAt.toISOString(),
  }
}

const NOTIFICATION_REALTIME_CHANNEL_PREFIX = 'notifications:user'

export function getNotificationRealtimeChannel(userId: string): NotificationRealtimeChannelDto {
  return {
    channel: `${NOTIFICATION_REALTIME_CHANNEL_PREFIX}:${userId}`,
    filter: `user_id=eq.${userId}`,
  }
}

export function toNotificationRealtimePayload(
  notification: NotificationListRecord | Notification,
): NotificationRealtimePayloadDto {
  return toNotificationDto(notification)
}

function assertNotificationOwnership(
  notification: NotificationOwnershipRecord,
  userId: string,
): asserts notification is NonNullable<NotificationOwnershipRecord> {
  if (!notification) {
    throw new NotificationNotFoundError()
  }

  if (notification.userId !== userId) {
    throw new NotificationOwnershipError()
  }
}

async function measureNotificationsServiceCall<T>(
  operation: string,
  context: Record<string, unknown>,
  run: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now()
  logInfo('notifications:service:before', {
    domain: 'notifications',
    operation,
    ...context,
  })

  const warningTimer = setTimeout(() => {
    logWarn('notifications:service:slow-await', {
      domain: 'notifications',
      operation,
      durationMs: Date.now() - startedAt,
      ...context,
    })
  }, 5000)

  try {
    const result = await run()
    logInfo('notifications:service:after', {
      domain: 'notifications',
      operation,
      durationMs: Date.now() - startedAt,
      ...context,
    })
    return result
  } finally {
    clearTimeout(warningTimer)
  }
}

export async function notifyUser(input: CreateNotificationInput): Promise<NotificationDto> {
  const created = await createNotification(input)
  return toNotificationRealtimePayload(created)
}

export async function notifyMany(inputs: CreateNotificationInput[]): Promise<NotificationDto[]> {
  const created = await createManyNotifications(inputs)
  return created.map(toNotificationDto)
}

export async function createOrderNotification(
  input: CreateTypedNotificationInput & {
    type: typeof NotificationType.ORDER_CREATED | typeof NotificationType.ORDER_SHIPPED
  },
): Promise<NotificationDto> {
  return notifyUser(input)
}

export async function createPaymentNotification(
  input: CreateTypedNotificationInput & {
    type: typeof NotificationType.PAYMENT_SUCCEEDED | typeof NotificationType.PAYMENT_FAILED
  },
): Promise<NotificationDto> {
  return notifyUser(input)
}

export async function createSellerNotification(
  input: CreateTypedNotificationInput & {
    type:
      | typeof NotificationType.SELLER_APPROVED
      | typeof NotificationType.SELLER_REJECTED
      | typeof NotificationType.SELLER_NEW_ORDER
      | typeof NotificationType.PRODUCT_APPROVED
      | typeof NotificationType.PRODUCT_REJECTED
  },
): Promise<NotificationDto> {
  return notifyUser(input)
}

export async function findExistingSellerNewOrderNotification(
  userId: string,
  dedupeKey: string,
): Promise<NotificationDto | null> {
  const notification = await findSellerNewOrderNotificationByDedupeKey(userId, dedupeKey)
  return notification ? toNotificationDto(notification) : null
}

export async function createAdminNotification(
  input: CreateAdminNotificationInput,
): Promise<NotificationDto[]> {
  const userIds =
    input.userIds && input.userIds.length > 0
      ? input.userIds
      : (await findAdminNotificationRecipients()).map((user) => user.id)

  if (userIds.length === 0) {
    return []
  }

  return notifyMany(
    userIds.map((userId) => ({
      userId,
      type: NotificationType.ADMIN_ALERT,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl ?? null,
      metadata: input.metadata ?? null,
    })),
  )
}

export async function getMyNotifications(
  user: SessionUser,
  query: NotificationQueryDto,
): Promise<NotificationListDto> {
  const [items, total] = await Promise.all([
    listNotificationsByUserId(user.id, query),
    countNotificationsByUserId(user.id, query),
  ])

  return {
    items: items.map(toNotificationDto),
    page: query.page,
    limit: query.limit,
    total,
  }
}

export async function getMyUnreadNotificationCount(
  user: SessionUser,
): Promise<NotificationUnreadCountDto> {
  const count = await measureNotificationsServiceCall(
    'countUnreadNotificationsByUserId',
    { userId: user.id },
    () => countUnreadNotificationsByUserId(user.id),
  )
  return { count }
}

export async function getUnreadNotificationCountByUserId(
  userId: string,
): Promise<NotificationUnreadCountDto> {
  const count = await measureNotificationsServiceCall(
    'countUnreadNotificationsByUserId',
    { userId },
    () => countUnreadNotificationsByUserId(userId),
  )
  logInfo('notifications:service:before-dto-mapping', {
    domain: 'notifications',
    operation: 'toUnreadCountDto',
    userId,
    count,
  })
  const dto = { count }
  logInfo('notifications:service:after-dto-mapping', {
    domain: 'notifications',
    operation: 'toUnreadCountDto',
    userId,
    count: dto.count,
  })
  return dto
}

export async function markMyNotificationRead(
  user: SessionUser,
  id: string,
): Promise<NotificationDto> {
  const notification = await findNotificationById(id)
  assertNotificationOwnership(notification, user.id)

  if (notification.readAt) {
    return toNotificationDto(notification)
  }

  const updated = await markNotificationRead(id, new Date())
  return toNotificationDto(updated)
}

export async function markMyNotificationsReadAll(
  user: SessionUser,
): Promise<NotificationMutationResultDto> {
  const result = await markAllNotificationsReadByUserId(user.id, new Date())
  return { count: result.count }
}

export async function deleteMyNotification(
  user: SessionUser,
  id: string,
): Promise<NotificationMutationResultDto> {
  const notification = await findNotificationById(id)
  assertNotificationOwnership(notification, user.id)
  await deleteNotificationById(id)
  return { id }
}
