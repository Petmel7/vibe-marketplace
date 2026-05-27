import { enqueueEmailEvent } from '../queue/email.queue'
import {
  findOrderNotificationContext,
  findProductNotificationContext,
  findUserNotificationContext,
} from '../email.repository'

export async function emitWelcomeEmailEvent(input: {
  email: string
  userId: string
}) {
  const user = await findUserNotificationContext(input.userId)

  return enqueueEmailEvent({
    eventType: 'USER_REGISTERED',
    dedupeKey: `welcome:${input.userId}`,
    recipientEmail: input.email,
    recipientUserId: input.userId,
    template: 'WELCOME_EMAIL',
    payload: {
      email: input.email,
      displayName: user?.profile?.displayName ?? null,
    },
  })
}

export async function emitOrderCreatedEmailEvent(input: {
  orderId: string
}) {
  const order = await findOrderNotificationContext(input.orderId)
  if (!order?.user.email) {
    return null
  }

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)

  return enqueueEmailEvent({
    eventType: 'ORDER_CREATED',
    dedupeKey: `order-created:${order.id}`,
    recipientEmail: order.user.email,
    recipientUserId: order.userId,
    template: 'ORDER_CREATED_EMAIL',
    payload: {
      orderId: order.id,
      itemCount,
      totalAmount: order.totalAmount.toString(),
    },
  })
}

export async function emitOrderConfirmedEmailEvent(input: {
  orderId: string
}) {
  const order = await findOrderNotificationContext(input.orderId)
  if (!order?.user.email) {
    return null
  }

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)

  return enqueueEmailEvent({
    eventType: 'ORDER_CONFIRMED',
    dedupeKey: `order-confirmed:${order.id}`,
    recipientEmail: order.user.email,
    recipientUserId: order.userId,
    template: 'ORDER_CONFIRMED_EMAIL',
    payload: {
      orderId: order.id,
      itemCount,
      totalAmount: order.totalAmount.toString(),
    },
  })
}

export async function emitSellerApprovedEmailEvent(input: {
  businessName: string | null
  sellerUserId: string
}) {
  const user = await findUserNotificationContext(input.sellerUserId)
  if (!user?.email) {
    return null
  }

  return enqueueEmailEvent({
    eventType: 'SELLER_APPROVED',
    dedupeKey: `seller-approved:${input.sellerUserId}`,
    recipientEmail: user.email,
    recipientUserId: input.sellerUserId,
    template: 'SELLER_APPROVED_EMAIL',
    payload: {
      businessName: input.businessName,
    },
  })
}

export async function emitSellerRejectedEmailEvent(input: {
  businessName: string | null
  reason: string
  sellerUserId: string
}) {
  const user = await findUserNotificationContext(input.sellerUserId)
  if (!user?.email) {
    return null
  }

  return enqueueEmailEvent({
    eventType: 'SELLER_REJECTED',
    dedupeKey: `seller-rejected:${input.sellerUserId}:${input.reason}`,
    recipientEmail: user.email,
    recipientUserId: input.sellerUserId,
    template: 'SELLER_REJECTED_EMAIL',
    payload: {
      businessName: input.businessName,
      reason: input.reason,
    },
  })
}

export async function emitProductApprovedEmailEvent(input: {
  productId: string
}) {
  const product = await findProductNotificationContext(input.productId)
  if (!product?.store.owner.email) {
    return null
  }

  return enqueueEmailEvent({
    eventType: 'PRODUCT_APPROVED',
    dedupeKey: `product-approved:${product.id}`,
    recipientEmail: product.store.owner.email,
    recipientUserId: product.store.ownerId,
    template: 'PRODUCT_APPROVED_EMAIL',
    payload: {
      productName: product.name,
      storeName: product.store.name,
    },
  })
}

export async function emitProductRejectedEmailEvent(input: {
  productId: string
  reason: string
}) {
  const product = await findProductNotificationContext(input.productId)
  if (!product?.store.owner.email) {
    return null
  }

  return enqueueEmailEvent({
    eventType: 'PRODUCT_REJECTED',
    dedupeKey: `product-rejected:${product.id}:${input.reason}`,
    recipientEmail: product.store.owner.email,
    recipientUserId: product.store.ownerId,
    template: 'PRODUCT_REJECTED_EMAIL',
    payload: {
      productName: product.name,
      storeName: product.store.name,
      reason: input.reason,
    },
  })
}
