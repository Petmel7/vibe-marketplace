import type {
  EmailDeliveryStatus,
  EmailEventStatus,
  EmailProvider,
} from '@/app/generated/prisma/client'

export const EMAIL_EVENT_TYPES = [
  'USER_REGISTERED',
  'ORDER_CREATED',
  'ORDER_CONFIRMED',
  'SELLER_APPROVED',
  'SELLER_REJECTED',
  'PRODUCT_APPROVED',
  'PRODUCT_REJECTED',
] as const

export const EMAIL_TEMPLATE_KEYS = [
  'WELCOME_EMAIL',
  'ORDER_CREATED_EMAIL',
  'ORDER_CONFIRMED_EMAIL',
  'SELLER_APPROVED_EMAIL',
  'SELLER_REJECTED_EMAIL',
  'PRODUCT_APPROVED_EMAIL',
  'PRODUCT_REJECTED_EMAIL',
] as const

export type EmailEventType = (typeof EMAIL_EVENT_TYPES)[number]
export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number]

export interface WelcomeEmailPayload {
  displayName: string | null
  email: string
}

export interface OrderCreatedEmailPayload {
  orderId: string
  itemCount: number
  totalAmount: string
}

export interface OrderConfirmedEmailPayload {
  orderId: string
  itemCount: number
  totalAmount: string
}

export interface SellerApprovedEmailPayload {
  businessName: string | null
}

export interface SellerRejectedEmailPayload {
  businessName: string | null
  reason: string
}

export interface ProductApprovedEmailPayload {
  productName: string
  storeName: string
}

export interface ProductRejectedEmailPayload {
  productName: string
  storeName: string
  reason: string
}

export type EmailTemplatePayloadMap = {
  ORDER_CONFIRMED_EMAIL: OrderConfirmedEmailPayload
  ORDER_CREATED_EMAIL: OrderCreatedEmailPayload
  PRODUCT_APPROVED_EMAIL: ProductApprovedEmailPayload
  PRODUCT_REJECTED_EMAIL: ProductRejectedEmailPayload
  SELLER_APPROVED_EMAIL: SellerApprovedEmailPayload
  SELLER_REJECTED_EMAIL: SellerRejectedEmailPayload
  WELCOME_EMAIL: WelcomeEmailPayload
}

export type EmailTemplatePayload<TTemplate extends EmailTemplateKey = EmailTemplateKey> =
  EmailTemplatePayloadMap[TTemplate]

export interface EnqueueEmailEventDto<TTemplate extends EmailTemplateKey = EmailTemplateKey> {
  dedupeKey: string
  eventType: EmailEventType
  maxAttempts?: number
  payload: EmailTemplatePayload<TTemplate>
  recipientEmail: string
  recipientUserId?: string | null
  template: TTemplate
}

export interface RenderedEmailTemplateDto {
  html: string
  subject: string
  template: EmailTemplateKey
  text: string
}

export interface SendEmailNowInput {
  html: string
  recipientEmail: string
  replyTo?: string | null
  subject: string
  text: string
}

export interface SendEmailNowResult {
  provider: EmailProvider
  providerMessageId: string | null
  status: EmailDeliveryStatus
}

export interface EmailLogDto {
  createdAt: string
  deliveredAt: string | null
  emailEventId: string | null
  errorMessage: string | null
  id: string
  openedAt: string | null
  provider: EmailProvider
  providerMessageId: string | null
  recipientEmail: string
  recipientUserId: string | null
  sentAt: string | null
  status: EmailDeliveryStatus
  subject: string
  template: string
  updatedAt: string
  bouncedAt: string | null
  clickedAt: string | null
}

export interface EmailEventDto {
  attempts: number
  createdAt: string
  dedupeKey: string
  eventType: string
  failedAt: string | null
  id: string
  maxAttempts: number
  nextAttemptAt: string | null
  payload: unknown
  processedAt: string | null
  recipientEmail: string
  recipientUserId: string | null
  status: EmailEventStatus
  template: string
  updatedAt: string
}

export interface EmailEventDetailDto extends EmailEventDto {
  logs: EmailLogDto[]
}

export interface EmailEventListDto {
  items: EmailEventDto[]
  limit: number
  page: number
  total: number
}

export interface AdminEmailQueryDto {
  eventType?: EmailEventType
  limit: number
  page: number
  status?: EmailEventStatus
  template?: EmailTemplateKey
}
