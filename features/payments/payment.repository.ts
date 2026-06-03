import Decimal from 'decimal.js'
import {
  OrderStatus,
  PromotionDiscountType,
  Prisma,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
  type PaymentProvider,
} from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { CheckoutStockUnavailableError } from '@/lib/errors/checkout'
import { PaymentWebhookDuplicateError } from '@/lib/errors/payment'
import {
  PromotionExpiredError,
  PromotionInactiveError,
  PromotionMinimumAmountError,
  PromotionNotFoundError,
  PromotionUsageLimitReachedError,
  PromotionUserLimitReachedError,
} from '@/lib/errors/promotion'
import type { PaymentDiagnosticsQueryDto } from './payment.dto'

const paymentDetailInclude = {
  order: {
    include: {
      items: {
        select: {
          storeId: true,
          store: {
            select: {
              id: true,
              ownerId: true,
              name: true,
            },
          },
        },
      },
    },
  },
  attempts: {
    orderBy: { createdAt: 'desc' },
  },
  refunds: {
    orderBy: { createdAt: 'desc' },
  },
  webhookEvents: {
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.PaymentInclude

function isPrismaUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export async function findPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: paymentDetailInclude,
  })
}

export async function findPaymentCheckoutSessionById(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: {
      attempts: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      order: true,
    },
  })
}

export async function findPaymentByProviderPaymentId(providerPaymentId: string) {
  return prisma.payment.findFirst({
    where: { providerPaymentId },
    include: paymentDetailInclude,
  })
}

export async function listPayments(query: PaymentDiagnosticsQueryDto) {
  return prisma.payment.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.provider ? { provider: query.provider } : {}),
      ...(query.method ? { method: query.method } : {}),
      ...(query.orderId ? { orderId: query.orderId } : {}),
    },
    include: {
      order: true,
      attempts: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
      refunds: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
      webhookEvents: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })
}

export async function countPayments(query: PaymentDiagnosticsQueryDto) {
  return prisma.payment.count({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.provider ? { provider: query.provider } : {}),
      ...(query.method ? { method: query.method } : {}),
      ...(query.orderId ? { orderId: query.orderId } : {}),
    },
  })
}

export async function createPaymentAttempt(input: {
  paymentId: string
  provider: PaymentProvider
  status: PaymentStatus
  amount: Decimal
  requestPayload: Prisma.InputJsonValue
  responsePayload?: Prisma.InputJsonValue
  errorMessage?: string | null
}) {
  return prisma.paymentAttempt.create({
    data: {
      paymentId: input.paymentId,
      provider: input.provider,
      status: input.status,
      amount: input.amount,
      requestPayload: input.requestPayload,
      ...(input.responsePayload !== undefined ? { responsePayload: input.responsePayload } : {}),
      errorMessage: input.errorMessage ?? null,
    },
  })
}

export async function createPaymentWebhookEvent(input: {
  paymentId?: string | null
  provider: PaymentProvider
  providerEventId: string
  eventType: string
  payload: Prisma.InputJsonValue
  signatureValid: boolean
}) {
  try {
    return await prisma.paymentWebhookEvent.create({
      data: {
        paymentId: input.paymentId ?? null,
        provider: input.provider,
        providerEventId: input.providerEventId,
        eventType: input.eventType,
        payload: input.payload,
        signatureValid: input.signatureValid,
      },
    })
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      throw new PaymentWebhookDuplicateError()
    }

    throw error
  }
}

export async function markWebhookProcessed(id: string, processedAt: Date) {
  return prisma.paymentWebhookEvent.update({
    where: { id },
    data: {
      processedAt,
    },
  })
}

export async function submitCheckoutOrderWithPayment(data: {
  orderId: string
  paymentId: string
  userId: string
  cartId: string
  shippingAddressId: string
  note?: string
  orderStatus: string
  subtotalAmount: Decimal
  discountAmount: Decimal
  totalAmount: Decimal
  items: Array<{
    variantId: string
    storeId: string
    quantity: number
    unitPrice: Decimal
    productNameSnapshot: string
    variantSnapshot: string | null
    imageSnapshot: string | null
    storeNameSnapshot: string
    unitPriceSnapshot: Decimal
  }>
  stockUpdates: Array<{
    variantId: string
    qty: number
  }>
  promotion: {
    promotionId: string
    promotionCode: string
    discountAmount: Decimal
    subtotalAmount: Decimal
    userId: string
  } | null
  payment: {
    provider: PaymentProvider
    providerPaymentId: string | null
    status: PaymentStatus
    method: PaymentMethod
    amount: Decimal
    currency: string
    checkoutUrl: string | null
    failureReason: string | null
    paidAt: Date | null
    expiresAt: Date | null
    attemptRequestPayload: Prisma.InputJsonValue
    attemptResponsePayload?: Prisma.InputJsonValue
    attemptErrorMessage?: string | null
  }
}) {
  return prisma.$transaction(
    async (tx) => {
      let promotionSnapshot:
        | {
            promotionId: string
            promotionCode: string
            discountAmount: Decimal
          }
        | null = null

      if (data.promotion) {
        const promotion = await tx.promotion.findUnique({
          where: { id: data.promotion.promotionId },
        })

        if (!promotion) {
          throw new PromotionNotFoundError()
        }

        const now = new Date()
        if (!promotion.isActive) {
          throw new PromotionInactiveError()
        }

        if (promotion.startsAt > now || (promotion.endsAt != null && promotion.endsAt < now)) {
          throw new PromotionExpiredError()
        }

        if (promotion.minOrderAmount != null) {
          const minimumAmount = new Decimal(promotion.minOrderAmount.toString())
          if (data.promotion.subtotalAmount.lessThan(minimumAmount)) {
            throw new PromotionMinimumAmountError(
              `Order subtotal must be at least ${minimumAmount.toFixed(2)} to use this promotion`,
            )
          }
        }

        const [totalUsageCount, userUsageCount] = await Promise.all([
          promotion.usageLimit != null
            ? tx.promotionUsage.count({
                where: { promotionId: promotion.id },
              })
            : Promise.resolve(0),
          promotion.usageLimitPerUser != null
            ? tx.promotionUsage.count({
                where: {
                  promotionId: promotion.id,
                  userId: data.promotion.userId,
                },
              })
            : Promise.resolve(0),
        ])

        if (promotion.usageLimit != null && totalUsageCount >= promotion.usageLimit) {
          throw new PromotionUsageLimitReachedError()
        }

        if (promotion.usageLimitPerUser != null && userUsageCount >= promotion.usageLimitPerUser) {
          throw new PromotionUserLimitReachedError()
        }

        let recalculatedDiscount =
          promotion.discountType === PromotionDiscountType.PERCENTAGE
            ? data.promotion.subtotalAmount.mul(promotion.discountValue.toString()).div(100)
            : new Decimal(promotion.discountValue.toString())

        if (promotion.maxDiscountAmount != null) {
          recalculatedDiscount = Decimal.min(
            recalculatedDiscount,
            new Decimal(promotion.maxDiscountAmount.toString()),
          )
        }

        recalculatedDiscount = Decimal.min(
          recalculatedDiscount,
          data.promotion.subtotalAmount,
        ).toDecimalPlaces(2)

        promotionSnapshot = {
          promotionId: promotion.id,
          promotionCode: promotion.code,
          discountAmount: recalculatedDiscount,
        }
      }

      const order = await tx.order.create({
        data: {
          id: data.orderId,
          userId: data.userId,
          status: data.orderStatus as OrderStatus,
          totalAmount: data.totalAmount,
          shippingAddressId: data.shippingAddressId,
          note: data.note ?? null,
          updatedAt: new Date(),
        },
      })

      await tx.orderItem.createMany({
        data: data.items.map((item) => ({
          ...item,
          orderId: order.id,
        })),
      })

      for (const { variantId, qty } of data.stockUpdates) {
        const updated = await tx.productVariant.updateMany({
          where: {
            id: variantId,
            stock: { gte: qty },
          },
          data: {
            stock: { decrement: qty },
          },
        })

        if (updated.count === 0) {
          const variant = await tx.productVariant.findUnique({
            where: { id: variantId },
            select: { stock: true },
          })

          throw new CheckoutStockUnavailableError(variantId, variant?.stock ?? 0, qty)
        }
      }

      const payment = await tx.payment.create({
        data: {
          id: data.paymentId,
          orderId: order.id,
          provider: data.payment.provider,
          providerPaymentId: data.payment.providerPaymentId,
          status: data.payment.status,
          method: data.payment.method,
          amount: data.payment.amount,
          currency: data.payment.currency,
          checkoutUrl: data.payment.checkoutUrl,
          failureReason: data.payment.failureReason,
          paidAt: data.payment.paidAt,
          expiresAt: data.payment.expiresAt,
        },
      })

      await tx.paymentAttempt.create({
        data: {
          paymentId: payment.id,
          provider: data.payment.provider,
          status: data.payment.status,
          amount: data.payment.amount,
          requestPayload: data.payment.attemptRequestPayload,
          ...(data.payment.attemptResponsePayload !== undefined
            ? { responsePayload: data.payment.attemptResponsePayload }
            : {}),
          errorMessage: data.payment.attemptErrorMessage ?? null,
        },
      })

      if (promotionSnapshot) {
        await tx.orderPromotion.create({
          data: {
            orderId: order.id,
            promotionId: promotionSnapshot.promotionId,
            promotionCode: promotionSnapshot.promotionCode,
            discountAmount: promotionSnapshot.discountAmount,
          },
        })

        await tx.promotionUsage.create({
          data: {
            promotionId: promotionSnapshot.promotionId,
            userId: data.userId,
            orderId: order.id,
            discountAmount: promotionSnapshot.discountAmount,
          },
        })
      }

      await tx.cartItem.deleteMany({
        where: { cartId: data.cartId },
      })

      return { order, payment }
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  )
}

export async function applySuccessfulPayment(input: {
  paymentId: string
  paidAt: Date
}) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: input.paymentId },
      data: {
        status: PaymentStatus.SUCCEEDED,
        paidAt: input.paidAt,
        failureReason: null,
        updatedAt: input.paidAt,
      },
      include: {
        order: true,
        attempts: true,
        refunds: true,
        webhookEvents: true,
      },
    })

    const nextOrderStatus =
      payment.method === PaymentMethod.CASH_ON_DELIVERY
        ? payment.order.status
        : 'paid'

    const order =
      payment.method === PaymentMethod.CASH_ON_DELIVERY
        ? payment.order
        : await tx.order.update({
            where: { id: payment.orderId },
            data: {
              status: nextOrderStatus,
              updatedAt: input.paidAt,
            },
          })

    return { payment, order }
  })
}

export async function applyFailedPayment(input: {
  paymentId: string
  status: 'FAILED' | 'CANCELLED'
  failureReason?: string | null
}) {
  return prisma.payment.update({
    where: { id: input.paymentId },
    data: {
      status: input.status,
      failureReason: input.failureReason ?? null,
      updatedAt: new Date(),
    },
    include: paymentDetailInclude,
  })
}

export async function markManualPaymentSucceeded(paymentId: string) {
  return applySuccessfulPayment({
    paymentId,
    paidAt: new Date(),
  })
}

export async function createRefundRecord(input: {
  paymentId: string
  orderItemId?: string | null
  providerRefundId?: string | null
  status: RefundStatus
  amount: Decimal
  reason?: string | null
}) {
  return prisma.refund.create({
    data: {
      paymentId: input.paymentId,
      orderItemId: input.orderItemId ?? null,
      providerRefundId: input.providerRefundId ?? null,
      status: input.status,
      amount: input.amount,
      reason: input.reason ?? null,
    },
  })
}

export async function applyRefundOutcome(input: {
  paymentId: string
  amount: Decimal
  fullAmount: boolean
}) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: input.paymentId },
      data: {
        status: input.fullAmount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
        updatedAt: new Date(),
      },
      include: {
        order: true,
        attempts: true,
        refunds: true,
        webhookEvents: true,
      },
    })

    if (input.fullAmount) {
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'refunded',
          updatedAt: new Date(),
        },
      })
    }

    return payment
  })
}
