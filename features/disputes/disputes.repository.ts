import {
  DisputeStatus,
  type Prisma,
} from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type {
  AdminDisputeListQueryInput,
  DisputeListQueryInput,
} from './disputes.schema'

const disputeInclude = {
  order: {
    select: {
      id: true,
      userId: true,
      status: true,
      totalAmount: true,
      payments: {
        orderBy: [{ createdAt: 'desc' as const }],
        take: 1,
        select: {
          status: true,
          method: true,
        },
      },
      items: {
        select: {
          id: true,
          storeId: true,
          productNameSnapshot: true,
          storeNameSnapshot: true,
          variantSnapshot: true,
          quantity: true,
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
      productNameSnapshot: true,
      storeNameSnapshot: true,
      variantSnapshot: true,
      quantity: true,
      unitPriceSnapshot: true,
      storeId: true,
      store: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    },
  },
  store: {
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  },
  openedBy: {
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
  respondent: {
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
    },
  },
  messages: {
    orderBy: [{ createdAt: 'asc' as const }],
    select: {
      id: true,
      senderId: true,
      message: true,
      isInternal: true,
      createdAt: true,
      sender: {
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
  evidence: {
    orderBy: [{ createdAt: 'desc' as const }],
    select: {
      id: true,
      storagePath: true,
      fileName: true,
      fileType: true,
      fileSize: true,
      createdAt: true,
      uploadedById: true,
    },
  },
} satisfies Prisma.DisputeInclude

export type DisputeRecord = Prisma.DisputeGetPayload<{
  include: typeof disputeInclude
}>

export type DisputeMessageRecord = Prisma.DisputeMessageGetPayload<{
  include: {
    sender: {
      select: {
        id: true
        email: true
        name: true
        profile: {
          select: {
            displayName: true
          }
        }
      }
    }
  }
}>

export type DisputeEvidenceRecord = Prisma.DisputeEvidenceGetPayload<{
  select: {
    id: true
    disputeId: true
    uploadedById: true
    storagePath: true
    fileName: true
    fileType: true
    fileSize: true
    createdAt: true
  }
}>

const ACTIVE_DISPUTE_STATUSES = [
  DisputeStatus.OPEN,
  DisputeStatus.UNDER_REVIEW,
  DisputeStatus.WAITING_BUYER,
  DisputeStatus.WAITING_SELLER,
  DisputeStatus.ESCALATED,
] as const

export async function findOrderDisputeAccessContext(params: {
  orderId: string
  orderItemId?: string | null
  userId: string
}): Promise<{
  orderId: string
  orderItemId: string | null
  buyerUserId: string
  storeId: string | null
  storeOwnerId: string | null
  orderStatus: string
  paymentStatus: string | null
} | null> {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: {
      id: true,
      userId: true,
      status: true,
      payments: {
        orderBy: [{ createdAt: 'desc' }],
        take: 1,
        select: {
          status: true,
        },
      },
      items: {
        select: {
          id: true,
          storeId: true,
          store: {
            select: {
              ownerId: true,
            },
          },
        },
      },
    },
  })

  if (!order || order.userId !== params.userId) {
    return null
  }

  if (params.orderItemId) {
    const orderItem = order.items.find((item) => item.id === params.orderItemId)
    if (!orderItem) {
      return null
    }

    return {
      orderId: order.id,
      orderItemId: orderItem.id,
      buyerUserId: order.userId,
      storeId: orderItem.storeId,
      storeOwnerId: orderItem.store.ownerId,
      orderStatus: order.status,
      paymentStatus: order.payments[0]?.status ?? null,
    }
  }

  const uniqueStoreIds = [...new Set(order.items.map((item) => item.storeId))]
  if (uniqueStoreIds.length !== 1) {
    return {
      orderId: order.id,
      orderItemId: null,
      buyerUserId: order.userId,
      storeId: null,
      storeOwnerId: null,
      orderStatus: order.status,
      paymentStatus: order.payments[0]?.status ?? null,
    }
  }

  const firstItem = order.items[0] ?? null
  return {
    orderId: order.id,
    orderItemId: null,
    buyerUserId: order.userId,
    storeId: firstItem?.storeId ?? null,
    storeOwnerId: firstItem?.store.ownerId ?? null,
    orderStatus: order.status,
    paymentStatus: order.payments[0]?.status ?? null,
  }
}

export async function findActiveDisputeForCreation(params: {
  orderId: string
  orderItemId?: string | null
  openedById: string
}) {
  return prisma.dispute.findFirst({
    where: {
      orderId: params.orderId,
      orderItemId: params.orderItemId ?? null,
      openedById: params.openedById,
      status: {
        in: [...ACTIVE_DISPUTE_STATUSES],
      },
    },
    include: disputeInclude,
  })
}

export async function createDisputeRecord(input: {
  orderId: string
  orderItemId?: string | null
  openedById: string
  respondentId?: string | null
  storeId?: string | null
  reason: Prisma.DisputeCreateInput['reason']
  status?: Prisma.DisputeCreateInput['status']
  priority: Prisma.DisputeCreateInput['priority']
  description: string
}): Promise<DisputeRecord> {
  return prisma.dispute.create({
    data: {
      orderId: input.orderId,
      orderItemId: input.orderItemId ?? null,
      openedById: input.openedById,
      respondentId: input.respondentId ?? null,
      storeId: input.storeId ?? null,
      reason: input.reason,
      status: input.status ?? DisputeStatus.OPEN,
      priority: input.priority,
      description: input.description,
    },
    include: disputeInclude,
  })
}

export async function findDisputeById(id: string): Promise<DisputeRecord | null> {
  return prisma.dispute.findUnique({
    where: { id },
    include: disputeInclude,
  })
}

export async function listBuyerDisputes(userId: string, query: DisputeListQueryInput) {
  const where: Prisma.DisputeWhereInput = {
    openedById: userId,
    status: query.status,
  }
  const skip = (query.page - 1) * query.limit

  const [items, total] = await Promise.all([
    prisma.dispute.findMany({
      where,
      include: disputeInclude,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: query.limit,
    }),
    prisma.dispute.count({ where }),
  ])

  return { items, total }
}

export async function listSellerDisputes(ownerId: string, query: DisputeListQueryInput) {
  const where: Prisma.DisputeWhereInput = {
    status: query.status,
    OR: [
      {
        store: {
          ownerId,
        },
      },
      {
        orderItem: {
          store: {
            ownerId,
          },
        },
      },
      {
        order: {
          items: {
            some: {
              store: {
                ownerId,
              },
            },
          },
        },
      },
    ],
  }
  const skip = (query.page - 1) * query.limit

  const [items, total] = await Promise.all([
    prisma.dispute.findMany({
      where,
      include: disputeInclude,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: query.limit,
    }),
    prisma.dispute.count({ where }),
  ])

  return { items, total }
}

export async function listAdminDisputes(query: AdminDisputeListQueryInput) {
  const where: Prisma.DisputeWhereInput = {
    status: query.status,
    reason: query.reason,
    priority: query.priority,
    storeId: query.storeId,
    createdAt:
      query.dateFrom || query.dateTo
        ? {
            gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
            lte: query.dateTo ? new Date(query.dateTo) : undefined,
          }
        : undefined,
  }
  const skip = (query.page - 1) * query.limit

  const [items, total] = await Promise.all([
    prisma.dispute.findMany({
      where,
      include: disputeInclude,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: query.limit,
    }),
    prisma.dispute.count({ where }),
  ])

  return { items, total }
}

export async function updateDisputeStatusRecord(input: {
  id: string
  status: Prisma.DisputeUpdateInput['status']
  resolutionNote?: string | null
  resolvedById?: string | null
  resolvedAt?: Date | null
}): Promise<DisputeRecord> {
  return prisma.dispute.update({
    where: { id: input.id },
    data: {
      status: input.status,
      resolutionNote:
        input.resolutionNote !== undefined ? input.resolutionNote : undefined,
      resolvedById:
        input.resolvedById !== undefined ? input.resolvedById : undefined,
      resolvedAt:
        input.resolvedAt !== undefined ? input.resolvedAt : undefined,
    },
    include: disputeInclude,
  })
}

export async function createDisputeMessageRecord(input: {
  disputeId: string
  senderId: string
  message: string
  isInternal: boolean
}): Promise<DisputeMessageRecord> {
  return prisma.disputeMessage.create({
    data: input,
    include: {
      sender: {
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

export async function countEvidenceByDisputeId(disputeId: string): Promise<number> {
  return prisma.disputeEvidence.count({
    where: { disputeId },
  })
}

export async function createDisputeEvidenceRecord(input: {
  id: string
  disputeId: string
  uploadedById: string
  storagePath: string
  fileName: string
  fileType: string
  fileSize: number
}): Promise<DisputeEvidenceRecord> {
  return prisma.disputeEvidence.create({
    data: input,
    select: {
      id: true,
      disputeId: true,
      uploadedById: true,
      storagePath: true,
      fileName: true,
      fileType: true,
      fileSize: true,
      createdAt: true,
    },
  })
}
