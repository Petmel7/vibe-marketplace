import type { PaymentMethod, PaymentProvider, PaymentStatus } from '@/app/generated/prisma/client'
import { enqueueEmailEvent } from '../queue/email.queue'
import { getAppBaseUrl } from '@/config/env'
import {
  findAdminEmailRecipients,
  findOrderNotificationContext,
  findPaymentNotificationContext,
  findPayoutNotificationContext,
  findProductNotificationContext,
  findRefundRequestNotificationContext,
  findUserNotificationContext,
} from '../email.repository'
import type {
  MarketplaceOrderEmailPayload,
  OrderEmailItemPayload,
  PaymentFailedEmailPayload,
  PaymentSucceededEmailPayload,
  RefundApprovedEmailPayload,
  RefundFailedEmailPayload,
  RefundRejectedEmailPayload,
  RefundRequestedEmailPayload,
  RefundSucceededEmailPayload,
  SellerNewOrderEmailPayload,
  SellerPayoutPaidEmailPayload,
} from '../email.dto'

function buildAppUrl(path: string): string {
  const appUrl = getAppBaseUrl()
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
  return context.shippingAddressName ?? context.user.profile?.displayName ?? context.user.name ?? null
}

function toOrderEmailItems(
  items: Array<{
    productNameSnapshot: string
    quantity: number
    storeNameSnapshot: string
    unitPriceSnapshot: { toString(): string }
    variantSnapshot: string | null
  }>,
): OrderEmailItemPayload[] {
  return items.map((item) => ({
    productName: item.productNameSnapshot,
    quantity: item.quantity,
    storeName: item.storeNameSnapshot,
    unitPrice: item.unitPriceSnapshot.toString(),
    variantLabel: item.variantSnapshot,
  }))
}

function buildMarketplaceOrderPayload(input: {
  order: {
    id: string
    status: string
    totalAmount: { toString(): string }
    shippingAddressName?: string | null
    user: {
      email: string | null
      name?: string | null
      profile?: {
        displayName?: string | null
      } | null
    }
    items: Array<{
      productNameSnapshot: string
      quantity: number
      storeNameSnapshot: string
      unitPriceSnapshot: { toString(): string }
      variantSnapshot: string | null
    }>
  }
  payment?: {
    method: PaymentMethod | null
    status: PaymentStatus | null
  } | null
}): MarketplaceOrderEmailPayload {
  const orderItems = toOrderEmailItems(input.order.items)
  const storeNames = [...new Set(orderItems.map((item) => item.storeName))]

  return {
    buyerEmail: input.order.user.email ?? '',
    buyerName: resolveBuyerName(input.order),
    itemCount: orderItems.reduce((sum, item) => sum + item.quantity, 0),
    orderDetailsUrl: buildAppUrl(`/profile/orders/${input.order.id}`),
    orderId: input.order.id,
    orderItems,
    orderStatus: input.order.status,
    paymentMethod: input.payment?.method ?? null,
    paymentStatus: input.payment?.status ?? null,
    storeNames,
    totalAmount: input.order.totalAmount.toString(),
  }
}

function buildPaymentSucceededPayload(input: {
  payment: {
    id: string
    method: PaymentMethod
    paidAt: Date | null
    provider: PaymentProvider
    status: PaymentStatus
  }
  order: Parameters<typeof buildMarketplaceOrderPayload>[0]['order']
}): PaymentSucceededEmailPayload {
  const basePayload = buildMarketplaceOrderPayload({
    order: input.order,
    payment: {
      method: input.payment.method,
      status: input.payment.status,
    },
  })

  return {
    ...basePayload,
    paidAt: input.payment.paidAt?.toISOString() ?? null,
    paymentId: input.payment.id,
    paymentProvider: input.payment.provider,
  }
}

function buildPaymentFailedPayload(input: {
  payment: {
    failureReason: string | null
    id: string
    method: PaymentMethod
    provider: PaymentProvider
    status: PaymentStatus
  }
  order: Parameters<typeof buildMarketplaceOrderPayload>[0]['order']
}): PaymentFailedEmailPayload {
  const basePayload = buildMarketplaceOrderPayload({
    order: input.order,
    payment: {
      method: input.payment.method,
      status: input.payment.status,
    },
  })

  return {
    ...basePayload,
    failureReason: input.payment.failureReason,
    paymentId: input.payment.id,
    paymentProvider: input.payment.provider,
  }
}

function buildSellerNewOrderPayload(input: {
  items: Array<{
    productNameSnapshot: string
    quantity: number
    storeNameSnapshot: string
    unitPriceSnapshot: { toString(): string }
    variantSnapshot: string | null
  }>
  order: {
    id: string
    status: string
    totalAmount: { toString(): string }
    shippingAddressName?: string | null
    user: {
      email: string | null
      name?: string | null
      profile?: {
        displayName?: string | null
      } | null
    }
  }
  payment: {
    method: PaymentMethod
    status: PaymentStatus
  }
  storeName: string
}): SellerNewOrderEmailPayload {
  const orderItems = toOrderEmailItems(input.items)

  return {
    buyerEmail: input.order.user.email ?? '',
    buyerName: resolveBuyerName(input.order),
    itemCount: orderItems.reduce((sum, item) => sum + item.quantity, 0),
    orderDetailsUrl: buildAppUrl('/seller/orders'),
    orderId: input.order.id,
    orderItems,
    orderStatus: input.order.status,
    paymentMethod: input.payment.method,
    paymentStatus: input.payment.status,
    storeName: input.storeName,
    totalAmount: input.order.totalAmount.toString(),
  }
}

function buildSellerPayoutPaidPayload(input: {
  payout: {
    amount: { toString(): string }
    currency: string
    id: string
    method: string
    paidAt: Date | null
    status: string
    store: { name: string }
    seller: {
      email: string | null
      name?: string | null
      profile?: { displayName?: string | null } | null
    }
  }
}): SellerPayoutPaidEmailPayload {
  return {
    amount: input.payout.amount.toString(),
    currency: input.payout.currency,
    paidAt: input.payout.paidAt?.toISOString() ?? null,
    payoutId: input.payout.id,
    payoutMethod: input.payout.method,
    payoutStatus: input.payout.status,
    sellerName: input.payout.seller.profile?.displayName ?? input.payout.seller.name ?? null,
    storeName: input.payout.store.name,
  }
}

function buildRefundLifecyclePayload(input: {
  refundRequest: {
    id: string
    orderId: string
    reason: string
    status: string
    amount: { toString(): string }
    currency: string
    adminNote: string | null
    requestedBy: {
      email: string | null
      name?: string | null
      profile?: {
        displayName?: string | null
      } | null
    }
    order: {
      id: string
      status: string
    }
    payment: {
      status: PaymentStatus
    }
    orderItem: {
      productNameSnapshot: string
      store: {
        id: string
        name: string
        ownerId: string
        owner: {
          email: string | null
          name?: string | null
          profile?: {
            displayName?: string | null
          } | null
        }
      }
    } | null
  }
  actionUrl: string
  adminNote: string | null
}): RefundRequestedEmailPayload {
  return {
    actionUrl: input.actionUrl,
    adminNote: input.adminNote,
    buyerEmail: input.refundRequest.requestedBy.email ?? '',
    buyerName: resolveBuyerName({
      user: input.refundRequest.requestedBy,
    }),
    currency: input.refundRequest.currency,
    orderId: input.refundRequest.order.id,
    paymentStatus: input.refundRequest.payment.status,
    productName: input.refundRequest.orderItem?.productNameSnapshot ?? null,
    reason: input.refundRequest.reason,
    refundAmount: input.refundRequest.amount.toString(),
    refundRequestId: input.refundRequest.id,
    status: input.refundRequest.status,
    storeName: input.refundRequest.orderItem?.store.name ?? null,
  }
}

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

  return enqueueEmailEvent({
    eventType: 'ORDER_CREATED',
    dedupeKey: `order-created:${order.id}:${order.userId}`,
    recipientEmail: order.user.email,
    recipientUserId: order.userId,
    template: 'ORDER_CREATED_EMAIL',
    payload: buildMarketplaceOrderPayload({
      order,
      payment: order.payments[0]
        ? {
            method: order.payments[0].method,
            status: order.payments[0].status,
          }
        : null,
    }),
  })
}

export async function emitOrderConfirmedEmailEvent(input: {
  orderId: string
}) {
  const order = await findOrderNotificationContext(input.orderId)
  if (!order?.user.email) {
    return null
  }

  return enqueueEmailEvent({
    eventType: 'ORDER_CONFIRMED',
    dedupeKey: `order-confirmed:${order.id}:${order.userId}`,
    recipientEmail: order.user.email,
    recipientUserId: order.userId,
    template: 'ORDER_CONFIRMED_EMAIL',
    payload: buildMarketplaceOrderPayload({
      order,
      payment: order.payments[0]
        ? {
            method: order.payments[0].method,
            status: order.payments[0].status,
          }
        : null,
    }),
  })
}

export async function emitPaymentSucceededEmailEvent(input: {
  paymentId: string
}) {
  const payment = await findPaymentNotificationContext(input.paymentId)
  if (!payment?.order.user.email) {
    return null
  }

  return enqueueEmailEvent({
    eventType: 'PAYMENT_SUCCEEDED',
    dedupeKey: `payment-succeeded:${payment.id}:${payment.order.userId}`,
    recipientEmail: payment.order.user.email,
    recipientUserId: payment.order.userId,
    template: 'PAYMENT_SUCCEEDED_EMAIL',
    payload: buildPaymentSucceededPayload({
      payment,
      order: payment.order,
    }),
  })
}

export async function emitPaymentFailedEmailEvent(input: {
  paymentId: string
}) {
  const payment = await findPaymentNotificationContext(input.paymentId)
  if (!payment?.order.user.email) {
    return null
  }

  return enqueueEmailEvent({
    eventType: 'PAYMENT_FAILED',
    dedupeKey: `payment-failed:${payment.id}:${payment.order.userId}`,
    recipientEmail: payment.order.user.email,
    recipientUserId: payment.order.userId,
    template: 'PAYMENT_FAILED_EMAIL',
    payload: buildPaymentFailedPayload({
      payment,
      order: payment.order,
    }),
  })
}

export async function emitSellerNewOrderEmailEvents(input: {
  paymentId: string
}) {
  const payment = await findPaymentNotificationContext(input.paymentId)
  if (!payment) {
    return []
  }

  const itemsByStore = new Map<
    string,
    {
      ownerEmail: string | null
      ownerId: string
      items: typeof payment.order.items
      storeName: string
    }
  >()

  for (const item of payment.order.items) {
    const current = itemsByStore.get(item.storeId)

    if (current) {
      current.items.push(item)
      continue
    }

    itemsByStore.set(item.storeId, {
      ownerEmail: item.store.owner.email,
      ownerId: item.store.ownerId,
      items: [item],
      storeName: item.store.name,
    })
  }

  return Promise.all(
    [...itemsByStore.entries()].map(async ([storeId, store]) => {
      if (!store.ownerEmail) {
        return null
      }

      return enqueueEmailEvent({
        eventType: 'SELLER_NEW_ORDER',
        dedupeKey: `seller-new-order:${payment.orderId}:${storeId}`,
        recipientEmail: store.ownerEmail,
        recipientUserId: store.ownerId,
        template: 'SELLER_NEW_ORDER_EMAIL',
        payload: buildSellerNewOrderPayload({
          items: store.items,
          order: payment.order,
          payment: {
            method: payment.method,
            status: payment.status,
          },
          storeName: store.storeName,
        }),
      })
    }),
  )
}

export async function emitSellerPayoutPaidEmailEvent(input: { payoutId: string }) {
  const payout = await findPayoutNotificationContext(input.payoutId)
  if (!payout?.seller.email) {
    return null
  }

  return enqueueEmailEvent({
    eventType: 'SELLER_PAYOUT_PAID',
    dedupeKey: `seller-payout-paid:${payout.id}:${payout.seller.id}`,
    recipientEmail: payout.seller.email,
    recipientUserId: payout.seller.id,
    template: 'SELLER_PAYOUT_PAID_EMAIL',
    payload: buildSellerPayoutPaidPayload({ payout }),
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

export async function emitRefundRequestedEmailEvents(input: { refundRequestId: string }) {
  const refundRequest = await findRefundRequestNotificationContext(input.refundRequestId)
  if (!refundRequest?.requestedBy.email) {
    return []
  }

  const buyerPayload = buildRefundLifecyclePayload({
    refundRequest,
    actionUrl: buildAppUrl(`/profile/refunds/${refundRequest.id}`),
    adminNote: null,
  })

  const results = await Promise.all([
    enqueueEmailEvent({
      eventType: 'REFUND_REQUESTED',
      dedupeKey: `refund-requested:${refundRequest.id}:buyer`,
      recipientEmail: refundRequest.requestedBy.email,
      recipientUserId: refundRequest.requestedById,
      template: 'REFUND_REQUESTED_EMAIL',
      payload: buyerPayload,
    }),
    ...(refundRequest.orderItem?.store.owner.email
      ? [
          enqueueEmailEvent({
            eventType: 'REFUND_REQUESTED',
            dedupeKey: `refund-requested:${refundRequest.id}:seller:${refundRequest.orderItem.store.id}`,
            recipientEmail: refundRequest.orderItem.store.owner.email,
            recipientUserId: refundRequest.orderItem.store.ownerId,
            template: 'REFUND_REQUESTED_EMAIL',
            payload: buildRefundLifecyclePayload({
              refundRequest,
              actionUrl: buildAppUrl(`/seller/refunds/${refundRequest.id}`),
              adminNote: null,
            }),
          }),
        ]
      : []),
  ])

  const admin = (await findAdminEmailRecipients())[0] ?? null
  const adminEvents =
    admin?.email
      ? [
          await enqueueEmailEvent({
            eventType: 'REFUND_REQUESTED',
            dedupeKey: `refund-requested:${refundRequest.id}:admin`,
            recipientEmail: admin.email,
            recipientUserId: admin.id,
            template: 'REFUND_REQUESTED_EMAIL',
            payload: buildRefundLifecyclePayload({
              refundRequest,
              actionUrl: buildAppUrl(`/admin/refunds/${refundRequest.id}`),
              adminNote: null,
            }),
          }),
        ]
      : []

  return [...results, ...adminEvents]
}

export async function emitRefundApprovedEmailEvent(input: { refundRequestId: string }) {
  const refundRequest = await findRefundRequestNotificationContext(input.refundRequestId)
  if (!refundRequest?.requestedBy.email) {
    return null
  }

  return enqueueEmailEvent({
    eventType: 'REFUND_APPROVED',
    dedupeKey: `refund-approved:${refundRequest.id}:buyer`,
    recipientEmail: refundRequest.requestedBy.email,
    recipientUserId: refundRequest.requestedById,
    template: 'REFUND_APPROVED_EMAIL',
    payload: buildRefundLifecyclePayload({
      refundRequest,
      actionUrl: buildAppUrl(`/profile/refunds/${refundRequest.id}`),
      adminNote: null,
    }) satisfies RefundApprovedEmailPayload,
  })
}

export async function emitRefundRejectedEmailEvent(input: { refundRequestId: string }) {
  const refundRequest = await findRefundRequestNotificationContext(input.refundRequestId)
  if (!refundRequest?.requestedBy.email) {
    return null
  }

  return enqueueEmailEvent({
    eventType: 'REFUND_REJECTED',
    dedupeKey: `refund-rejected:${refundRequest.id}:buyer`,
    recipientEmail: refundRequest.requestedBy.email,
    recipientUserId: refundRequest.requestedById,
    template: 'REFUND_REJECTED_EMAIL',
    payload: buildRefundLifecyclePayload({
      refundRequest,
      actionUrl: buildAppUrl(`/profile/refunds/${refundRequest.id}`),
      adminNote: refundRequest.adminNote,
    }) satisfies RefundRejectedEmailPayload,
  })
}

export async function emitRefundSucceededEmailEvents(input: { refundRequestId: string }) {
  const refundRequest = await findRefundRequestNotificationContext(input.refundRequestId)
  if (!refundRequest?.requestedBy.email) {
    return []
  }

  return Promise.all([
    enqueueEmailEvent({
      eventType: 'REFUND_SUCCEEDED',
      dedupeKey: `refund-succeeded:${refundRequest.id}:buyer`,
      recipientEmail: refundRequest.requestedBy.email,
      recipientUserId: refundRequest.requestedById,
      template: 'REFUND_SUCCEEDED_EMAIL',
      payload: buildRefundLifecyclePayload({
        refundRequest,
        actionUrl: buildAppUrl(`/profile/refunds/${refundRequest.id}`),
        adminNote: null,
      }) satisfies RefundSucceededEmailPayload,
    }),
    ...(refundRequest.orderItem?.store.owner.email
      ? [
          enqueueEmailEvent({
            eventType: 'REFUND_SUCCEEDED',
            dedupeKey: `refund-succeeded:${refundRequest.id}:seller:${refundRequest.orderItem.store.id}`,
            recipientEmail: refundRequest.orderItem.store.owner.email,
            recipientUserId: refundRequest.orderItem.store.ownerId,
            template: 'REFUND_SUCCEEDED_EMAIL',
            payload: buildRefundLifecyclePayload({
              refundRequest,
              actionUrl: buildAppUrl(`/seller/refunds/${refundRequest.id}`),
              adminNote: null,
            }),
          }),
        ]
      : []),
  ])
}

export async function emitRefundFailedEmailEvent(input: { refundRequestId: string }) {
  const refundRequest = await findRefundRequestNotificationContext(input.refundRequestId)
  if (!refundRequest?.requestedBy.email) {
    return null
  }

  return enqueueEmailEvent({
    eventType: 'REFUND_FAILED',
    dedupeKey: `refund-failed:${refundRequest.id}:buyer`,
    recipientEmail: refundRequest.requestedBy.email,
    recipientUserId: refundRequest.requestedById,
    template: 'REFUND_FAILED_EMAIL',
    payload: buildRefundLifecyclePayload({
      refundRequest,
      actionUrl: buildAppUrl(`/profile/refunds/${refundRequest.id}`),
      adminNote: null,
    }) satisfies RefundFailedEmailPayload,
  })
}
