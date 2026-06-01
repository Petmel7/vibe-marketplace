import type { NotificationType } from '@/app/generated/prisma/client'

export type NotificationMetadataDto = Record<string, unknown> | null

export interface NotificationDto {
  actionUrl: string | null
  createdAt: string
  id: string
  message: string
  metadata: NotificationMetadataDto
  readAt: string | null
  title: string
  type: NotificationType
  updatedAt: string
}

export interface NotificationListDto {
  items: NotificationDto[]
  limit: number
  page: number
  total: number
}

export interface NotificationUnreadCountDto {
  count: number
}

export interface NotificationMutationResultDto {
  count?: number
  id?: string
}

export interface NotificationQueryDto {
  limit: number
  page: number
  unread?: boolean
}

export interface CreateNotificationInput {
  actionUrl?: string | null
  message: string
  metadata?: Record<string, unknown> | null
  title: string
  type: NotificationType
  userId: string
}

export interface CreateTypedNotificationInput {
  actionUrl?: string | null
  message: string
  metadata?: Record<string, unknown> | null
  title: string
  userId: string
}

export interface CreateAdminNotificationInput {
  actionUrl?: string | null
  message: string
  metadata?: Record<string, unknown> | null
  title: string
  userIds?: string[]
}
