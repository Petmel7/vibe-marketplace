import { z } from 'zod'
import { EMAIL_EVENT_TYPES, EMAIL_TEMPLATE_KEYS } from './email.dto'

export const emailEventTypeSchema = z.enum(EMAIL_EVENT_TYPES)
export const emailTemplateKeySchema = z.enum(EMAIL_TEMPLATE_KEYS)
export const emailEventStatusSchema = z.enum(['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED'])

export const welcomeEmailPayloadSchema = z.object({
  displayName: z.string().trim().min(1).nullable(),
  email: z.email(),
})

export const orderCreatedEmailPayloadSchema = z.object({
  orderId: z.uuid(),
  itemCount: z.number().int().positive(),
  totalAmount: z.string().min(1),
})

export const orderConfirmedEmailPayloadSchema = z.object({
  orderId: z.uuid(),
  itemCount: z.number().int().positive(),
  totalAmount: z.string().min(1),
})

export const sellerApprovedEmailPayloadSchema = z.object({
  businessName: z.string().trim().min(1).nullable(),
})

export const sellerRejectedEmailPayloadSchema = z.object({
  businessName: z.string().trim().min(1).nullable(),
  reason: z.string().trim().min(1),
})

export const productApprovedEmailPayloadSchema = z.object({
  productName: z.string().trim().min(1),
  storeName: z.string().trim().min(1),
})

export const productRejectedEmailPayloadSchema = z.object({
  productName: z.string().trim().min(1),
  storeName: z.string().trim().min(1),
  reason: z.string().trim().min(1),
})

export const emailTemplatePayloadSchemaMap = {
  ORDER_CONFIRMED_EMAIL: orderConfirmedEmailPayloadSchema,
  ORDER_CREATED_EMAIL: orderCreatedEmailPayloadSchema,
  PRODUCT_APPROVED_EMAIL: productApprovedEmailPayloadSchema,
  PRODUCT_REJECTED_EMAIL: productRejectedEmailPayloadSchema,
  SELLER_APPROVED_EMAIL: sellerApprovedEmailPayloadSchema,
  SELLER_REJECTED_EMAIL: sellerRejectedEmailPayloadSchema,
  WELCOME_EMAIL: welcomeEmailPayloadSchema,
} as const

export const enqueueEmailEventSchema = z.object({
  dedupeKey: z.string().trim().min(1),
  eventType: emailEventTypeSchema,
  maxAttempts: z.number().int().positive().max(10).optional(),
  payload: z.unknown(),
  recipientEmail: z.email(),
  recipientUserId: z.uuid().nullable().optional(),
  template: emailTemplateKeySchema,
})

export const adminEmailQuerySchema = z.object({
  eventType: emailEventTypeSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  page: z.coerce.number().int().positive().default(1),
  status: emailEventStatusSchema.optional(),
  template: emailTemplateKeySchema.optional(),
})
