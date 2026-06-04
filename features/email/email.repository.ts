import { Prisma, type EmailDeliveryStatus, type EmailProvider } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { EmailDuplicateEventError } from '@/lib/errors/email'
import type { AdminEmailQueryDto, EmailTemplateKey } from './email.dto'

const emailEventInclude = {
  logs: {
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.EmailEventInclude

const notificationOrderItemsSelect = {
  id: true,
  quantity: true,
  storeId: true,
  productNameSnapshot: true,
  variantSnapshot: true,
  storeNameSnapshot: true,
  unitPriceSnapshot: true,
  store: {
    select: {
      id: true,
      name: true,
      slug: true,
      ownerId: true,
      owner: {
        select: {
          email: true,
          name: true,
          profile: {
            select: {
              displayName: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.OrderItemSelect

const notificationOrderSelect = {
  id: true,
  userId: true,
  status: true,
  totalAmount: true,
  shippingAddressId: true,
  user: {
    select: {
      email: true,
      name: true,
      profile: {
        select: {
          displayName: true,
        },
      },
    },
  },
  payments: {
    orderBy: [{ createdAt: 'desc' }],
    take: 1,
    select: {
      id: true,
      provider: true,
      method: true,
      status: true,
      failureReason: true,
      paidAt: true,
    },
  },
  items: {
    orderBy: [{ createdAt: 'asc' }],
    select: notificationOrderItemsSelect,
  },
} satisfies Prisma.OrderSelect

function isPrismaUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export async function findEmailEventByDedupeKey(dedupeKey: string) {
  return prisma.emailEvent.findUnique({
    where: { dedupeKey },
    include: emailEventInclude,
  })
}

export async function findEmailEventById(id: string) {
  return prisma.emailEvent.findUnique({
    where: { id },
    include: emailEventInclude,
  })
}

export async function createEmailEvent(input: {
  dedupeKey: string
  eventType: string
  maxAttempts: number
  payload: Prisma.InputJsonValue
  recipientEmail: string
  recipientUserId?: string | null
  template: EmailTemplateKey
}) {
  try {
    return await prisma.emailEvent.create({
      data: {
        dedupeKey: input.dedupeKey,
        eventType: input.eventType,
        recipientEmail: input.recipientEmail,
        recipientUserId: input.recipientUserId ?? null,
        template: input.template,
        payload: input.payload,
        maxAttempts: input.maxAttempts,
        updatedAt: new Date(),
      },
      include: emailEventInclude,
    })
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      throw new EmailDuplicateEventError()
    }

    throw error
  }
}

export async function claimEmailEventForProcessing(
  id: string,
  now: Date,
  options?: { ignoreSchedule?: boolean },
) {
  const result = await prisma.emailEvent.updateMany({
    where: {
      id,
      status: { in: ['PENDING', 'FAILED'] },
      ...(options?.ignoreSchedule
        ? {}
        : {
            OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
          }),
    },
    data: {
      status: 'PROCESSING',
      updatedAt: now,
    },
  })

  return result.count > 0
}

export async function markEmailEventSent(input: {
  attempts: number
  id: string
  processedAt: Date
}) {
  return prisma.emailEvent.update({
    where: { id: input.id },
    data: {
      attempts: input.attempts,
      failedAt: null,
      nextAttemptAt: null,
      processedAt: input.processedAt,
      status: 'SENT',
      updatedAt: input.processedAt,
    },
    include: emailEventInclude,
  })
}

export async function markEmailEventFailed(input: {
  attempts: number
  failedAt: Date
  id: string
  nextAttemptAt: Date | null
}) {
  return prisma.emailEvent.update({
    where: { id: input.id },
    data: {
      attempts: input.attempts,
      failedAt: input.failedAt,
      nextAttemptAt: input.nextAttemptAt,
      processedAt: null,
      status: 'FAILED',
      updatedAt: input.failedAt,
    },
    include: emailEventInclude,
  })
}

export async function createEmailLog(input: {
  bouncedAt?: Date | null
  clickedAt?: Date | null
  deliveredAt?: Date | null
  emailEventId?: string | null
  errorMessage?: string | null
  openedAt?: Date | null
  provider: EmailProvider
  providerMessageId?: string | null
  recipientEmail: string
  recipientUserId?: string | null
  sentAt?: Date | null
  status: EmailDeliveryStatus
  subject: string
  template: string
}) {
  return prisma.emailLog.create({
    data: {
      emailEventId: input.emailEventId ?? null,
      provider: input.provider,
      providerMessageId: input.providerMessageId ?? null,
      recipientEmail: input.recipientEmail,
      recipientUserId: input.recipientUserId ?? null,
      template: input.template,
      subject: input.subject,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
      sentAt: input.sentAt ?? null,
      deliveredAt: input.deliveredAt ?? null,
      bouncedAt: input.bouncedAt ?? null,
      openedAt: input.openedAt ?? null,
      clickedAt: input.clickedAt ?? null,
      updatedAt: new Date(),
    },
  })
}

export async function listEmailEvents(query: AdminEmailQueryDto) {
  const where: Prisma.EmailEventWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.eventType ? { eventType: query.eventType } : {}),
    ...(query.template ? { template: query.template } : {}),
  }

  return prisma.emailEvent.findMany({
    where,
    include: {
      logs: {
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })
}

export async function countEmailEvents(query: AdminEmailQueryDto) {
  return prisma.emailEvent.count({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.template ? { template: query.template } : {}),
    },
  })
}

export async function findUserNotificationContext(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          displayName: true,
        },
      },
    },
  })
}

export async function findAdminEmailRecipients() {
  return prisma.user.findMany({
    where: {
      roles: {
        some: {
          role: 'ADMIN',
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      profile: {
        select: {
          displayName: true,
        },
      },
    },
  })
}

export async function findOrderNotificationContext(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: notificationOrderSelect,
  })

  if (!order) {
    return null
  }

  const shippingAddress = order.shippingAddressId
    ? await prisma.shippingAddress.findUnique({
        where: { id: order.shippingAddressId },
        select: {
          fullName: true,
        },
      })
    : null

  return {
    ...order,
    shippingAddressName: shippingAddress?.fullName ?? null,
  }
}

export async function findPaymentNotificationContext(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      provider: true,
      method: true,
      status: true,
      amount: true,
      currency: true,
      failureReason: true,
      paidAt: true,
      orderId: true,
      order: {
        select: notificationOrderSelect,
      },
    },
  })

  if (!payment) {
    return null
  }

  const shippingAddress = payment.order.shippingAddressId
    ? await prisma.shippingAddress.findUnique({
        where: { id: payment.order.shippingAddressId },
        select: {
          fullName: true,
        },
      })
    : null

  return {
    ...payment,
    order: {
      ...payment.order,
      shippingAddressName: shippingAddress?.fullName ?? null,
    },
  }
}

export async function findProductNotificationContext(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      store: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          owner: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  })
}

export async function findPayoutNotificationContext(payoutId: string) {
  return prisma.payout.findUnique({
    where: { id: payoutId },
    select: {
      id: true,
      amount: true,
      currency: true,
      paidAt: true,
      method: true,
      status: true,
      store: {
        select: {
          id: true,
          name: true,
        },
      },
      seller: {
        select: {
          id: true,
          email: true,
          name: true,
          profile: {
            select: {
              displayName: true,
            },
          },
        },
      },
    },
  })
}

export async function findRefundRequestNotificationContext(refundRequestId: string) {
  return prisma.refundRequest.findUnique({
    where: { id: refundRequestId },
    select: {
      id: true,
      orderId: true,
      orderItemId: true,
      reason: true,
      status: true,
      amount: true,
      currency: true,
      adminNote: true,
      requestedById: true,
      requestedBy: {
        select: {
          id: true,
          email: true,
          name: true,
          profile: {
            select: {
              displayName: true,
            },
          },
        },
      },
      order: {
        select: {
          id: true,
          status: true,
        },
      },
      payment: {
        select: {
          id: true,
          status: true,
        },
      },
      orderItem: {
        select: {
          id: true,
          productNameSnapshot: true,
          storeId: true,
          store: {
            select: {
              id: true,
              name: true,
              ownerId: true,
              owner: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  profile: {
                    select: {
                      displayName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
}
