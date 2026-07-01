import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/notifications/notifications.repository', () => ({
  countNotificationsByUserId: vi.fn(),
  countUnreadNotificationsByUserId: vi.fn(),
  createManyNotifications: vi.fn(),
  createNotification: vi.fn(),
  deleteNotificationById: vi.fn(),
  findAdminNotificationRecipients: vi.fn(),
  findNotificationById: vi.fn(),
  findSellerNewOrderNotificationByDedupeKey: vi.fn(),
  listNotificationsByUserId: vi.fn(),
  markAllNotificationsReadByUserId: vi.fn(),
  markNotificationRead: vi.fn(),
}))

import { NotificationType } from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import { NotificationNotFoundError, NotificationOwnershipError } from '@/lib/errors/notification'
import * as repo from './notifications.repository'
import {
  createAdminNotification,
  getNotificationRealtimeChannel,
  getMyNotifications,
  getMyUnreadNotificationCount,
  getUnreadNotificationCountByUserId,
  markMyNotificationRead,
  markMyNotificationsReadAll,
  notifyUser,
  toNotificationRealtimePayload,
  deleteMyNotification,
} from './notifications.service'

const mockRepo = vi.mocked(repo)

const user: SessionUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'buyer@example.com',
  roles: [],
}

function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    userId: user.id,
    type: NotificationType.ORDER_CREATED,
    title: 'Замовлення створено',
    message: 'Тестове повідомлення',
    actionUrl: '/profile/orders/order-1',
    metadata: { orderId: 'order-1' },
    readAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('notifications.service', () => {
  it('creates a notification for one user', async () => {
    mockRepo.createNotification.mockResolvedValue(makeNotification() as never)

    const result = await notifyUser({
      userId: user.id,
      type: NotificationType.ORDER_CREATED,
      title: 'Замовлення створено',
      message: 'Тестове повідомлення',
      actionUrl: '/profile/orders/order-1',
      metadata: { orderId: 'order-1' },
    })

    expect(mockRepo.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        type: NotificationType.ORDER_CREATED,
      }),
    )
    expect(result.id).toBe('22222222-2222-4222-8222-222222222222')
  })

  it('lists only own notifications with pagination', async () => {
    mockRepo.listNotificationsByUserId.mockResolvedValue([makeNotification()] as never)
    mockRepo.countNotificationsByUserId.mockResolvedValue(1)

    const result = await getMyNotifications(user, { page: 1, limit: 20 })

    expect(mockRepo.listNotificationsByUserId).toHaveBeenCalledWith(user.id, { page: 1, limit: 20 })
    expect(result.total).toBe(1)
    expect(result.items[0]?.title).toBe('Замовлення створено')
  })

  it('maps notification payloads safely for client delivery', () => {
    const result = toNotificationRealtimePayload(
      makeNotification({
        metadata: ['unsafe-array'],
      }) as never,
    )

    expect(result).toEqual({
      id: '22222222-2222-4222-8222-222222222222',
      type: NotificationType.ORDER_CREATED,
      title: 'Замовлення створено',
      message: 'Тестове повідомлення',
      actionUrl: '/profile/orders/order-1',
      metadata: null,
      readAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(result).not.toHaveProperty('userId')
  })

  it('builds a user-scoped realtime channel descriptor', () => {
    expect(
      getNotificationRealtimeChannel('11111111-1111-4111-8111-111111111111'),
    ).toEqual({
      channel: 'notifications:user:11111111-1111-4111-8111-111111111111',
      filter: 'user_id=eq.11111111-1111-4111-8111-111111111111',
    })
  })

  it('returns unread notification count', async () => {
    mockRepo.countUnreadNotificationsByUserId.mockResolvedValue(3)

    const result = await getMyUnreadNotificationCount(user)

    expect(result.count).toBe(3)
  })

  it('returns unread notification count directly by userId for lightweight API routes', async () => {
    mockRepo.countUnreadNotificationsByUserId.mockResolvedValue(4)

    const result = await getUnreadNotificationCountByUserId(user.id)

    expect(mockRepo.countUnreadNotificationsByUserId).toHaveBeenCalledWith(user.id)
    expect(result.count).toBe(4)
  })

  it('marks one notification as read', async () => {
    mockRepo.findNotificationById.mockResolvedValue(makeNotification() as never)
    mockRepo.markNotificationRead.mockResolvedValue(
      makeNotification({
        readAt: new Date('2026-01-01T01:00:00.000Z'),
        updatedAt: new Date('2026-01-01T01:00:00.000Z'),
      }) as never,
    )

    const result = await markMyNotificationRead(user, '22222222-2222-4222-8222-222222222222')

    expect(mockRepo.markNotificationRead).toHaveBeenCalled()
    expect(result.readAt).toBe('2026-01-01T01:00:00.000Z')
  })

  it('marks all notifications as read', async () => {
    mockRepo.markAllNotificationsReadByUserId.mockResolvedValue({ count: 5 } as never)

    const result = await markMyNotificationsReadAll(user)

    expect(result.count).toBe(5)
  })

  it('blocks ownership violations', async () => {
    mockRepo.findNotificationById.mockResolvedValue(
      makeNotification({ userId: '33333333-3333-4333-8333-333333333333' }) as never,
    )

    await expect(
      markMyNotificationRead(user, '22222222-2222-4222-8222-222222222222'),
    ).rejects.toThrow(NotificationOwnershipError)
  })

  it('throws when notification does not exist', async () => {
    mockRepo.findNotificationById.mockResolvedValue(null)

    await expect(
      deleteMyNotification(user, '22222222-2222-4222-8222-222222222222'),
    ).rejects.toThrow(NotificationNotFoundError)
  })

  it('creates admin notifications for all admins when no userIds are provided', async () => {
    mockRepo.findAdminNotificationRecipients.mockResolvedValue([
      { id: 'admin-1' },
      { id: 'admin-2' },
    ] as never)
    mockRepo.createManyNotifications.mockResolvedValue([
      makeNotification({ userId: 'admin-1', type: NotificationType.ADMIN_ALERT }),
      makeNotification({ id: '44444444-4444-4444-8444-444444444444', userId: 'admin-2', type: NotificationType.ADMIN_ALERT }),
    ] as never)

    const result = await createAdminNotification({
      title: 'Admin alert',
      message: 'System event',
    })

    expect(mockRepo.createManyNotifications).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ userId: 'admin-1', type: NotificationType.ADMIN_ALERT }),
        expect.objectContaining({ userId: 'admin-2', type: NotificationType.ADMIN_ALERT }),
      ]),
    )
    expect(result).toHaveLength(2)
  })
})
