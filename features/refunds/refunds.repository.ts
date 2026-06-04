import {
  RefundActionType,
  RefundRequestStatus,
  type Prisma,
  type RefundStatus,
  type SellerLedgerEntryStatus,
  type SellerLedgerEntryType,
} from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type {
  AdminRefundListQueryInput,
  RefundListQueryInput,
  SellerRefundListQueryInput,
} from './refunds.schema'

const refundRequestInclude = {
  order: {
    select: {
      id: true,
      userId: true,
      status: true,
      totalAmount: true,
      orderPromotion: {
        select: {
          id: true,
          ownerType: true,
          storeId: true,
          discountAmount: true,
          promotionCode: true,
        },
      },
      items: {
        orderBy: [{ createdAt: 'asc' as const }],
        select: {
          id: true,
          storeId: true,
          quantity: true,
          productNameSnapshot: true,
          storeNameSnapshot: true,
          unitPriceSnapshot: true,
          store: {
            select: {
              id: true,
              name: true,
              ownerId: true,
            },
          },
        },
      },
    },
  },
  orderItem: {
    select: {
      id: true,
      orderId: true,
      storeId: true,
      quantity: true,
      productNameSnapshot: true,
      storeNameSnapshot: true,
      unitPriceSnapshot: true,
      store: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
      platformCommission: {
        select: {
          id: true,
          sellerId: true,
          storeId: true,
          currency: true,
          sellerNetAmount: true,
          grossAmount: true,
        },
      },
    },
  },
  payment: {
    select: {
      id: true,
      orderId: true,
      status: true,
      method: true,
      amount: true,
      currency: true,
      refunds: {
        where: { status: 'SUCCEEDED' },
        select: {
          id: true,
          amount: true,
        },
      },
    },
  },
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
  resolvedBy: {
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
  actions: {
    orderBy: [{ createdAt: 'asc' as const }],
    select: {
      id: true,
      actionType: true,
      note: true,
      createdAt: true,
      actorId: true,
      actor: {
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
  refunds: {
    orderBy: [{ createdAt: 'desc' as const }],
    select: {
      id: true,
      paymentId: true,
      orderItemId: true,
      providerRefundId: true,
      status: true,
      amount: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.RefundRequestInclude

export type RefundRequestRecord = Prisma.RefundRequestGetPayload<{
  include: typeof refundRequestInclude
}>

function buildDateRangeFilter(dateFrom?: string, dateTo?: string): Prisma.DateTimeFilter | undefined {
  if (!dateFrom && !dateTo) {
    return undefined
  }

  return {
    ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
    ...(dateTo ? { lte: new Date(dateTo) } : {}),
  }
}

const ACTIVE_REFUND_REQUEST_STATUSES = [
  RefundRequestStatus.REQUESTED,
  RefundRequestStatus.UNDER_REVIEW,
  RefundRequestStatus.APPROVED,
  RefundRequestStatus.PROCESSING,
] as const

export async function findRefundRequestCreationContext(params: {
  orderId: string
  orderItemId: string
  userId: string
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: {
      id: true,
      userId: true,
      status: true,
      totalAmount: true,
      orderPromotion: {
        select: {
          id: true,
          ownerType: true,
          storeId: true,
          discountAmount: true,
          promotionCode: true,
        },
      },
      items: {
        orderBy: [{ createdAt: 'asc' }],
        select: {
          id: true,
          orderId: true,
          storeId: true,
          quantity: true,
          productNameSnapshot: true,
          storeNameSnapshot: true,
          unitPriceSnapshot: true,
          store: {
            select: {
              id: true,
              name: true,
              ownerId: true,
            },
          },
          platformCommission: {
            select: {
              id: true,
              sellerId: true,
              storeId: true,
              currency: true,
              sellerNetAmount: true,
              grossAmount: true,
            },
          },
        },
      },
      payments: {
        orderBy: [{ createdAt: 'desc' }],
        take: 1,
        select: {
          id: true,
          status: true,
          method: true,
          amount: true,
          currency: true,
          refunds: {
            where: { status: 'SUCCEEDED' },
            select: {
              id: true,
              amount: true,
              orderItemId: true,
            },
          },
        },
      },
    },
  })

  if (!order || order.userId !== params.userId) {
    return null
  }

  const orderItem = order.items.find((item) => item.id === params.orderItemId) ?? null
  if (!orderItem) {
    return null
  }

  return {
    order,
    orderItem,
    payment: order.payments[0] ?? null,
  }
}

export async function findActiveRefundRequestForOrderItem(orderItemId: string) {
  return prisma.refundRequest.findFirst({
    where: {
      orderItemId,
      status: { in: [...ACTIVE_REFUND_REQUEST_STATUSES] },
    },
    include: refundRequestInclude,
  })
}

export async function sumSucceededRefundRequestAmountsForOrderItem(orderItemId: string) {
  const aggregate = await prisma.refundRequest.aggregate({
    where: {
      orderItemId,
      status: RefundRequestStatus.SUCCEEDED,
    },
    _sum: {
      amount: true,
    },
  })

  return aggregate._sum.amount
}

export async function createRefundRequestRecord(input: {
  orderId: string
  orderItemId: string
  paymentId: string
  requestedById: string
  reason: Prisma.RefundRequestCreateInput['reason']
  amount: Prisma.Decimal
  currency: string
  description?: string | null
}): Promise<RefundRequestRecord> {
  return prisma.$transaction(async (tx) => {
    const refundRequest = await tx.refundRequest.create({
      data: {
        orderId: input.orderId,
        orderItemId: input.orderItemId,
        paymentId: input.paymentId,
        requestedById: input.requestedById,
        reason: input.reason,
        status: RefundRequestStatus.REQUESTED,
        amount: input.amount,
        currency: input.currency,
        description: input.description ?? null,
      },
    })

    await tx.refundAction.create({
      data: {
        refundRequestId: refundRequest.id,
        actorId: input.requestedById,
        actionType: RefundActionType.CREATED,
        note: input.description ?? null,
      },
    })

    return tx.refundRequest.findUniqueOrThrow({
      where: { id: refundRequest.id },
      include: refundRequestInclude,
    })
  })
}

export async function findRefundRequestById(id: string): Promise<RefundRequestRecord | null> {
  return prisma.refundRequest.findUnique({
    where: { id },
    include: refundRequestInclude,
  })
}

export async function listBuyerRefundRequests(userId: string, query: RefundListQueryInput) {
  const where: Prisma.RefundRequestWhereInput = {
    requestedById: userId,
    ...(query.status ? { status: query.status } : {}),
  }
  const skip = (query.page - 1) * query.limit

  const [items, total] = await Promise.all([
    prisma.refundRequest.findMany({
      where,
      include: refundRequestInclude,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: query.limit,
    }),
    prisma.refundRequest.count({ where }),
  ])

  return { items, total }
}

export async function listSellerRefundRequests(ownerId: string, query: SellerRefundListQueryInput) {
  const where: Prisma.RefundRequestWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.storeId ? { orderItem: { storeId: query.storeId } } : {}),
    orderItem: {
      ...(query.storeId ? { storeId: query.storeId } : {}),
      store: {
        ownerId,
      },
    },
  }
  const skip = (query.page - 1) * query.limit

  const [items, total] = await Promise.all([
    prisma.refundRequest.findMany({
      where,
      include: refundRequestInclude,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: query.limit,
    }),
    prisma.refundRequest.count({ where }),
  ])

  return { items, total }
}

export async function listAdminRefundRequests(query: AdminRefundListQueryInput) {
  const createdAt = buildDateRangeFilter(query.dateFrom, query.dateTo)
  const where: Prisma.RefundRequestWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.reason ? { reason: query.reason } : {}),
    ...(query.requestedById ? { requestedById: query.requestedById } : {}),
    ...(query.resolvedById ? { resolvedById: query.resolvedById } : {}),
    ...(query.storeId ? { orderItem: { storeId: query.storeId } } : {}),
    ...(createdAt ? { createdAt } : {}),
  }
  const skip = (query.page - 1) * query.limit

  const [items, total] = await Promise.all([
    prisma.refundRequest.findMany({
      where,
      include: refundRequestInclude,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: query.limit,
    }),
    prisma.refundRequest.count({ where }),
  ])

  return { items, total }
}

export async function transitionRefundRequestRecord(input: {
  id: string
  status: RefundRequestStatus
  adminNote?: string | null
  resolvedById?: string | null
  resolvedAt?: Date | null
  actionType: RefundActionType
  actorId: string
  actionNote?: string | null
  metadata?: Prisma.InputJsonValue
}): Promise<RefundRequestRecord> {
  return prisma.$transaction(async (tx) => {
    await tx.refundRequest.update({
      where: { id: input.id },
      data: {
        status: input.status,
        ...(input.adminNote !== undefined ? { adminNote: input.adminNote } : {}),
        ...(input.resolvedById !== undefined ? { resolvedById: input.resolvedById } : {}),
        ...(input.resolvedAt !== undefined ? { resolvedAt: input.resolvedAt } : {}),
      },
    })

    await tx.refundAction.create({
      data: {
        refundRequestId: input.id,
        actorId: input.actorId,
        actionType: input.actionType,
        note: input.actionNote ?? null,
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      },
    })

    return tx.refundRequest.findUniqueOrThrow({
      where: { id: input.id },
      include: refundRequestInclude,
    })
  })
}

export async function createRefundActionRecord(input: {
  refundRequestId: string
  actorId: string
  actionType: RefundActionType
  note?: string | null
  metadata?: Prisma.InputJsonValue
}) {
  return prisma.refundAction.create({
    data: {
      refundRequestId: input.refundRequestId,
      actorId: input.actorId,
      actionType: input.actionType,
      note: input.note ?? null,
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    },
    select: {
      id: true,
      refundRequestId: true,
      actorId: true,
      actionType: true,
      note: true,
      createdAt: true,
    },
  })
}

export async function findRefundRecordByRefundRequestId(refundRequestId: string) {
  return prisma.refund.findFirst({
    where: { refundRequestId },
  })
}

export async function upsertRefundRecordForRequest(input: {
  refundRequestId: string
  paymentId: string
  orderItemId?: string | null
  status: RefundStatus
  amount: Prisma.Decimal
  reason?: string | null
  providerRefundId?: string | null
}) {
  const existing = await prisma.refund.findFirst({
    where: { refundRequestId: input.refundRequestId },
  })

  if (existing) {
    return prisma.refund.update({
      where: { id: existing.id },
      data: {
        paymentId: input.paymentId,
        orderItemId: input.orderItemId ?? null,
        status: input.status,
        amount: input.amount,
        reason: input.reason ?? null,
        providerRefundId: input.providerRefundId ?? null,
      },
    })
  }

  return prisma.refund.create({
    data: {
      refundRequestId: input.refundRequestId,
      paymentId: input.paymentId,
      orderItemId: input.orderItemId ?? null,
      providerRefundId: input.providerRefundId ?? null,
      status: input.status,
      amount: input.amount,
      reason: input.reason ?? null,
    },
  })
}

export async function findSellerLedgerRefundReversalByDescription(input: {
  orderItemId: string
  description: string
}) {
  return prisma.sellerLedgerEntry.findFirst({
    where: {
      orderItemId: input.orderItemId,
      type: 'REFUND' as SellerLedgerEntryType,
      description: input.description,
    },
  })
}

export async function createSellerLedgerRefundReversal(input: {
  storeId: string
  sellerId: string
  orderItemId: string
  amount: Prisma.Decimal
  currency: string
  description: string
  status?: SellerLedgerEntryStatus
}) {
  return prisma.sellerLedgerEntry.create({
    data: {
      storeId: input.storeId,
      sellerId: input.sellerId,
      orderItemId: input.orderItemId,
      payoutId: null,
      type: 'REFUND' as SellerLedgerEntryType,
      status: input.status ?? ('AVAILABLE' as SellerLedgerEntryStatus),
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      availableAt: null,
    },
  })
}
