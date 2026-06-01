export const NOTIFICATION_TYPES = [
  'ORDER_CREATED',
  'PAYMENT_SUCCEEDED',
  'PAYMENT_FAILED',
  'ORDER_SHIPPED',
  'SELLER_APPROVED',
  'SELLER_REJECTED',
  'PRODUCT_APPROVED',
  'PRODUCT_REJECTED',
  'SELLER_NEW_ORDER',
  'ADMIN_ALERT',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export type NotificationMetadata = Record<string, unknown> | null

export type Notification = {
  actionUrl: string | null
  createdAt: string
  id: string
  message: string
  metadata: NotificationMetadata
  readAt: string | null
  title: string
  type: NotificationType
  updatedAt: string
}

export type NotificationListResponse = {
  items: Notification[]
  limit: number
  page: number
  total: number
}

export type NotificationUnreadCountResponse = {
  count: number
}

export type NotificationMutationResponse = {
  count?: number
  id?: string
}

export function isNotificationType(value: string | null | undefined): value is NotificationType {
  return Boolean(value && NOTIFICATION_TYPES.includes(value as NotificationType))
}

