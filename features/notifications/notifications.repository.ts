import { Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type { CreateNotificationInput, NotificationQueryDto } from './notifications.dto'
import { logInfo, logWarn } from '@/utils/logger'

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  actionUrl: true,
  metadata: true,
  readAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.NotificationSelect

async function measureNotificationsRepositoryCall<T>(
  operation: string,
  run: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now()
  logInfo('notifications:repository:before', {
    domain: 'notifications',
    operation,
  })

  const warningTimer = setTimeout(() => {
    logWarn('notifications:repository:slow-await', {
      domain: 'notifications',
      operation,
      durationMs: Date.now() - startedAt,
    })
  }, 5000)

  try {
    const result = await run()
    logInfo('notifications:repository:after', {
      domain: 'notifications',
      operation,
      durationMs: Date.now() - startedAt,
    })
    return result
  } finally {
    clearTimeout(warningTimer)
  }
}

function toNotificationMetadataInput(
  metadata: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return metadata == null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue)
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl ?? null,
      metadata: toNotificationMetadataInput(input.metadata),
    },
    select: notificationSelect,
  })
}

export async function createManyNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) {
    return []
  }

  return prisma.notification.createManyAndReturn({
    data: inputs.map((input) => ({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl ?? null,
      metadata: toNotificationMetadataInput(input.metadata),
    })),
    select: notificationSelect,
  })
}

export async function listNotificationsByUserId(userId: string, query: NotificationQueryDto) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(query.unread ? { readAt: null } : {}),
    },
    orderBy: [{ createdAt: 'desc' }],
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    select: notificationSelect,
  })
}

export async function countNotificationsByUserId(userId: string, query: NotificationQueryDto) {
  return prisma.notification.count({
    where: {
      userId,
      ...(query.unread ? { readAt: null } : {}),
    },
  })
}

export async function countUnreadNotificationsByUserId(userId: string) {
  return measureNotificationsRepositoryCall('countUnreadNotificationsByUserId', () =>
    prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    }),
  )
}

export async function findNotificationById(id: string) {
  return prisma.notification.findUnique({
    where: { id },
  })
}

export async function markNotificationRead(id: string, readAt: Date) {
  return prisma.notification.update({
    where: { id },
    data: {
      readAt,
      updatedAt: readAt,
    },
    select: notificationSelect,
  })
}

export async function markAllNotificationsReadByUserId(userId: string, readAt: Date) {
  return prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt,
      updatedAt: readAt,
    },
  })
}

export async function deleteNotificationById(id: string) {
  return prisma.notification.delete({
    where: { id },
  })
}

export async function findAdminNotificationRecipients() {
  return prisma.user.findMany({
    where: {
      roles: {
        some: {
          role: 'ADMIN',
        },
      },
    },
    select: {
      id: true,
    },
  })
}

export async function findSellerNewOrderNotificationByDedupeKey(userId: string, dedupeKey: string) {
  return prisma.notification.findFirst({
    where: {
      userId,
      type: 'SELLER_NEW_ORDER',
      metadata: {
        path: ['dedupeKey'],
        equals: dedupeKey,
      },
    },
    select: notificationSelect,
  })
}

export type NotificationRecord = Awaited<ReturnType<typeof createNotification>>
export type NotificationOwnershipRecord = Awaited<ReturnType<typeof findNotificationById>>
export type NotificationListRecord = Awaited<ReturnType<typeof listNotificationsByUserId>>[number]
