export const ADMIN_EMAIL_EVENT_STATUSES = [
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED',
  'CANCELLED',
] as const

export const ADMIN_EMAIL_DELIVERY_STATUSES = [
  'QUEUED',
  'SENT',
  'DELIVERED',
  'BOUNCED',
  'FAILED',
  'OPENED',
  'CLICKED',
] as const

export const ADMIN_EMAIL_EVENT_TYPES = [
  'USER_REGISTERED',
  'ORDER_CREATED',
  'ORDER_CONFIRMED',
  'SELLER_APPROVED',
  'SELLER_REJECTED',
  'PRODUCT_APPROVED',
  'PRODUCT_REJECTED',
] as const

export const ADMIN_EMAIL_TEMPLATE_KEYS = [
  'WELCOME_EMAIL',
  'ORDER_CREATED_EMAIL',
  'ORDER_CONFIRMED_EMAIL',
  'SELLER_APPROVED_EMAIL',
  'SELLER_REJECTED_EMAIL',
  'PRODUCT_APPROVED_EMAIL',
  'PRODUCT_REJECTED_EMAIL',
] as const

export type AdminEmailEventStatus = (typeof ADMIN_EMAIL_EVENT_STATUSES)[number]
export type AdminEmailDeliveryStatus = (typeof ADMIN_EMAIL_DELIVERY_STATUSES)[number]
export type AdminEmailEventType = (typeof ADMIN_EMAIL_EVENT_TYPES)[number]
export type AdminEmailTemplateKey = (typeof ADMIN_EMAIL_TEMPLATE_KEYS)[number]

export type AdminEmailLog = {
  id: string
  emailEventId: string | null
  provider: 'RESEND'
  providerMessageId: string | null
  recipientEmail: string
  recipientUserId: string | null
  template: string
  subject: string
  status: AdminEmailDeliveryStatus
  errorMessage: string | null
  sentAt: string | null
  deliveredAt: string | null
  bouncedAt: string | null
  openedAt: string | null
  clickedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AdminEmailEvent = {
  id: string
  eventType: string
  dedupeKey: string
  recipientEmail: string
  recipientUserId: string | null
  template: string
  payload: unknown
  status: AdminEmailEventStatus
  attempts: number
  maxAttempts: number
  nextAttemptAt: string | null
  processedAt: string | null
  failedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AdminEmailEventDetail = AdminEmailEvent & {
  logs: AdminEmailLog[]
}

export type AdminEmailListResponse = {
  items: AdminEmailEvent[]
  total: number
  page: number
  limit: number
}

export type AdminEmailFilters = {
  page: number
  limit: number
  status?: AdminEmailEventStatus
  eventType?: AdminEmailEventType
  template?: AdminEmailTemplateKey
}

export function getEmailEventStatusTone(status: AdminEmailEventStatus) {
  switch (status) {
    case 'SENT':
      return 'success' as const
    case 'FAILED':
      return 'danger' as const
    case 'PROCESSING':
      return 'info' as const
    case 'CANCELLED':
      return 'neutral' as const
    case 'PENDING':
    default:
      return 'warning' as const
  }
}

export function getEmailDeliveryStatusTone(status: AdminEmailDeliveryStatus) {
  switch (status) {
    case 'DELIVERED':
    case 'OPENED':
    case 'CLICKED':
      return 'success' as const
    case 'FAILED':
    case 'BOUNCED':
      return 'danger' as const
    case 'SENT':
      return 'info' as const
    case 'QUEUED':
    default:
      return 'warning' as const
  }
}

export function formatEmailEventLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
