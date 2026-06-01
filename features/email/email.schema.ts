import { z } from 'zod'
import { EMAIL_EVENT_TYPES, EMAIL_TEMPLATE_KEYS } from './email.dto'

export const emailEventTypeSchema = z.enum(EMAIL_EVENT_TYPES)
export const emailTemplateKeySchema = z.enum(EMAIL_TEMPLATE_KEYS)
export const emailEventStatusSchema = z.enum(['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED'])

export const welcomeEmailPayloadSchema = z.object({
  displayName: z.string().trim().min(1).nullable(),
  email: z.email(),
})

const orderEmailItemPayloadSchema = z.object({
  productName: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  storeName: z.string().trim().min(1),
  unitPrice: z.string().trim().min(1),
  variantLabel: z.string().trim().min(1).nullable(),
})

const marketplaceOrderEmailPayloadSchema = z.object({
  buyerEmail: z.email(),
  buyerName: z.string().trim().min(1).nullable(),
  itemCount: z.number().int().positive(),
  orderDetailsUrl: z.string().trim().min(1),
  orderId: z.uuid(),
  orderItems: z.array(orderEmailItemPayloadSchema).min(1),
  orderStatus: z.string().trim().min(1),
  paymentMethod: z.string().trim().min(1).nullable(),
  paymentStatus: z.string().trim().min(1).nullable(),
  storeNames: z.array(z.string().trim().min(1)).min(1),
  totalAmount: z.string().min(1),
})

export const orderCreatedEmailPayloadSchema = marketplaceOrderEmailPayloadSchema

export const orderConfirmedEmailPayloadSchema = marketplaceOrderEmailPayloadSchema

export const paymentSucceededEmailPayloadSchema = marketplaceOrderEmailPayloadSchema.extend({
  paidAt: z.string().datetime().nullable(),
  paymentId: z.uuid(),
  paymentProvider: z.string().trim().min(1),
})

export const paymentFailedEmailPayloadSchema = marketplaceOrderEmailPayloadSchema.extend({
  failureReason: z.string().trim().min(1).nullable(),
  paymentId: z.uuid(),
  paymentProvider: z.string().trim().min(1),
})

export const sellerNewOrderEmailPayloadSchema = z.object({
  buyerEmail: z.email(),
  buyerName: z.string().trim().min(1).nullable(),
  itemCount: z.number().int().positive(),
  orderDetailsUrl: z.string().trim().min(1),
  orderId: z.uuid(),
  orderItems: z.array(orderEmailItemPayloadSchema).min(1),
  orderStatus: z.string().trim().min(1),
  paymentMethod: z.string().trim().min(1).nullable(),
  paymentStatus: z.string().trim().min(1),
  storeName: z.string().trim().min(1),
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
  PAYMENT_FAILED_EMAIL: paymentFailedEmailPayloadSchema,
  PAYMENT_SUCCEEDED_EMAIL: paymentSucceededEmailPayloadSchema,
  PRODUCT_APPROVED_EMAIL: productApprovedEmailPayloadSchema,
  PRODUCT_REJECTED_EMAIL: productRejectedEmailPayloadSchema,
  SELLER_APPROVED_EMAIL: sellerApprovedEmailPayloadSchema,
  SELLER_NEW_ORDER_EMAIL: sellerNewOrderEmailPayloadSchema,
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
