import { NotificationType } from '@/app/generated/prisma/client'
import {
  findOrderNotificationContext,
  findPaymentNotificationContext,
  findProductNotificationContext,
} from '@/features/email/email.repository'
import {
  createOrderNotification,
  createPaymentNotification,
  createSellerNotification,
} from '../notifications.service'

function buildAppUrl(path: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!appUrl) {
    return path
  }

  try {
    return new URL(path, appUrl.endsWith('/') ? appUrl : `${appUrl}/`).toString()
  } catch {
    return path
  }
}

function resolveBuyerName(context: {
  shippingAddressName?: string | null
  user: {
    name?: string | null
    profile?: {
      displayName?: string | null
    } | null
  }
}) {
  return context.shippingAddressName ?? context.user.profile?.displayName ?? context.user.name ?? 'Покупець'
}

export async function emitOrderCreatedNotificationEvent(input: { orderId: string }) {
  const order = await findOrderNotificationContext(input.orderId)
  if (!order) {
    return null
  }

  return createOrderNotification({
    userId: order.userId,
    type: NotificationType.ORDER_CREATED,
    title: 'Замовлення створено',
    message: `Замовлення #${order.id.slice(0, 8)} на суму ${order.totalAmount.toString()} UAH успішно створено.`,
    actionUrl: buildAppUrl(`/profile/orders/${order.id}`),
    metadata: {
      orderId: order.id,
      orderStatus: order.status,
      paymentStatus: order.payments[0]?.status ?? null,
    },
  })
}

export async function emitPaymentSucceededNotificationEvent(input: { paymentId: string }) {
  const payment = await findPaymentNotificationContext(input.paymentId)
  if (!payment) {
    return null
  }

  return createPaymentNotification({
    userId: payment.order.userId,
    type: NotificationType.PAYMENT_SUCCEEDED,
    title: 'Оплату підтверджено',
    message: `Оплату для замовлення #${payment.order.id.slice(0, 8)} підтверджено.`,
    actionUrl: buildAppUrl(`/profile/orders/${payment.order.id}`),
    metadata: {
      orderId: payment.order.id,
      paymentId: payment.id,
      paymentMethod: payment.method,
      paymentProvider: payment.provider,
      paymentStatus: payment.status,
    },
  })
}

export async function emitPaymentFailedNotificationEvent(input: { paymentId: string }) {
  const payment = await findPaymentNotificationContext(input.paymentId)
  if (!payment) {
    return null
  }

  return createPaymentNotification({
    userId: payment.order.userId,
    type: NotificationType.PAYMENT_FAILED,
    title: 'Оплата не пройшла',
    message:
      payment.failureReason != null
        ? `Оплату для замовлення #${payment.order.id.slice(0, 8)} не підтверджено: ${payment.failureReason}.`
        : `Оплату для замовлення #${payment.order.id.slice(0, 8)} не підтверджено.`,
    actionUrl: buildAppUrl(`/profile/orders/${payment.order.id}`),
    metadata: {
      orderId: payment.order.id,
      paymentId: payment.id,
      paymentMethod: payment.method,
      paymentProvider: payment.provider,
      paymentStatus: payment.status,
      failureReason: payment.failureReason,
    },
  })
}

export async function emitSellerNewOrderNotificationEvents(input: { paymentId: string }) {
  const payment = await findPaymentNotificationContext(input.paymentId)
  if (!payment) {
    return []
  }

  const processedStoreIds = new Set<string>()

  const results = await Promise.all(
    payment.order.items.map(async (item) => {
      if (processedStoreIds.has(item.storeId)) {
        return null
      }

      processedStoreIds.add(item.storeId)

      return createSellerNotification({
        userId: item.store.ownerId,
        type: NotificationType.SELLER_NEW_ORDER,
        title: 'Нове оплачене замовлення',
        message: `Для магазину "${item.store.name}" надійшло нове оплачене замовлення від ${resolveBuyerName(payment.order)}.`,
        actionUrl: buildAppUrl('/seller/orders'),
        metadata: {
          orderId: payment.order.id,
          paymentId: payment.id,
          storeId: item.storeId,
          storeName: item.store.name,
          paymentStatus: payment.status,
        },
      })
    }),
  )

  return results.filter((result) => result != null)
}

export async function emitSellerApprovedNotificationEvent(input: {
  businessName: string | null
  sellerUserId: string
}) {
  return createSellerNotification({
    userId: input.sellerUserId,
    type: NotificationType.SELLER_APPROVED,
    title: 'Профіль продавця схвалено',
    message: input.businessName
      ? `Ваш продавецький профіль "${input.businessName}" успішно схвалено.`
      : 'Ваш продавецький профіль успішно схвалено.',
    actionUrl: buildAppUrl('/seller'),
    metadata: {
      businessName: input.businessName,
    },
  })
}

export async function emitSellerRejectedNotificationEvent(input: {
  businessName: string | null
  reason: string
  sellerUserId: string
}) {
  return createSellerNotification({
    userId: input.sellerUserId,
    type: NotificationType.SELLER_REJECTED,
    title: 'Профіль продавця потребує оновлення',
    message: input.businessName
      ? `Профіль "${input.businessName}" відхилено. Причина: ${input.reason}.`
      : `Ваш продавецький профіль відхилено. Причина: ${input.reason}.`,
    actionUrl: buildAppUrl('/profile/seller'),
    metadata: {
      businessName: input.businessName,
      reason: input.reason,
    },
  })
}

export async function emitProductApprovedNotificationEvent(input: { productId: string }) {
  const product = await findProductNotificationContext(input.productId)
  if (!product) {
    return null
  }

  return createSellerNotification({
    userId: product.store.ownerId,
    type: NotificationType.PRODUCT_APPROVED,
    title: 'Товар схвалено',
    message: `Товар "${product.name}" у магазині "${product.store.name}" успішно опубліковано.`,
    actionUrl: buildAppUrl(`/seller/products/${product.id}`),
    metadata: {
      productId: product.id,
      productName: product.name,
      storeId: product.store.id,
      storeName: product.store.name,
    },
  })
}

export async function emitProductRejectedNotificationEvent(input: {
  productId: string
  reason: string
}) {
  const product = await findProductNotificationContext(input.productId)
  if (!product) {
    return null
  }

  return createSellerNotification({
    userId: product.store.ownerId,
    type: NotificationType.PRODUCT_REJECTED,
    title: 'Товар відхилено',
    message: `Товар "${product.name}" відхилено. Причина: ${input.reason}.`,
    actionUrl: buildAppUrl(`/seller/products/${product.id}`),
    metadata: {
      productId: product.id,
      productName: product.name,
      storeId: product.store.id,
      storeName: product.store.name,
      reason: input.reason,
    },
  })
}
