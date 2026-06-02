import {
  AbuseReportActionType,
  AbuseReportReason,
  AbuseReportStatus,
  AbuseReportTargetType,
  type Prisma,
} from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type {
  AdminReportsQuery,
  CreateAbuseReportActionInput,
  MyReportsQuery,
  UpdateAbuseReportStatusInput,
} from './abuse-reports.schema'

const reportPreviewSelect = {
  reporter: {
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
  assignedAdmin: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
  resolvedBy: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
  actions: {
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      reportId: true,
      adminId: true,
      actionType: true,
      note: true,
      metadata: true,
      createdAt: true,
      admin: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.AbuseReportInclude

export type AbuseReportRecord = Prisma.AbuseReportGetPayload<{
  include: typeof reportPreviewSelect
}>

export type AbuseReportActionRecord = Prisma.AbuseReportActionGetPayload<{
  include: {
    admin: {
      select: {
        id: true
        email: true
        name: true
      }
    }
  }
}>

export type ProductReportTargetContext = {
  targetType: typeof AbuseReportTargetType.PRODUCT
  id: string
  productName: string
  productStatus: string
  ownerUserId: string
  storeId: string
  storeName: string
}

export type ReviewReportTargetContext = {
  targetType: typeof AbuseReportTargetType.REVIEW
  id: string
  reviewUserId: string
  reviewStatus: string
  reviewSnippet: string | null
  productId: string
  productName: string
  storeId: string
  storeName: string
  storeOwnerId: string
}

export type StoreReportTargetContext = {
  targetType: typeof AbuseReportTargetType.STORE
  id: string
  storeName: string
  storeSlug: string
  ownerUserId: string
  isActive: boolean
}

export type UserReportTargetContext = {
  targetType: typeof AbuseReportTargetType.USER
  id: string
  email: string
  name: string | null
  sellerProfileId: string | null
}

export type OrderReportTargetContext = {
  targetType: typeof AbuseReportTargetType.ORDER
  id: string
  orderUserId: string
  status: string
  totalAmount: Prisma.Decimal
  storeOwners: Array<{
    storeId: string
    storeName: string
    ownerId: string
  }>
}

export type AbuseReportTargetContext =
  | ProductReportTargetContext
  | ReviewReportTargetContext
  | StoreReportTargetContext
  | UserReportTargetContext
  | OrderReportTargetContext

type CreateAbuseReportRecordInput = {
  reporterId: string
  targetType: AbuseReportTargetType
  targetId: string
  reason: AbuseReportReason
  description?: string | null
}

type UpdateAbuseReportStatusRecordInput = UpdateAbuseReportStatusInput & {
  assignedAdminId?: string | null
  resolvedById?: string | null
  resolvedAt?: Date | null
}

export async function findActiveReportByReporterAndTarget(
  reporterId: string,
  targetType: AbuseReportTargetType,
  targetId: string,
): Promise<AbuseReportRecord | null> {
  return prisma.abuseReport.findFirst({
    where: {
      reporterId,
      targetType,
      targetId,
      status: {
        in: [AbuseReportStatus.PENDING, AbuseReportStatus.UNDER_REVIEW, AbuseReportStatus.ESCALATED],
      },
    },
    include: reportPreviewSelect,
  })
}

export async function createAbuseReportRecord(
  input: CreateAbuseReportRecordInput,
): Promise<AbuseReportRecord> {
  return prisma.abuseReport.create({
    data: {
      reporterId: input.reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      description: input.description ?? null,
    },
    include: reportPreviewSelect,
  })
}

export async function findAbuseReportById(id: string): Promise<AbuseReportRecord | null> {
  return prisma.abuseReport.findUnique({
    where: { id },
    include: reportPreviewSelect,
  })
}

export async function listReportsByReporterId(
  reporterId: string,
  query: MyReportsQuery,
): Promise<{ items: AbuseReportRecord[]; total: number }> {
  const where: Prisma.AbuseReportWhereInput = { reporterId, status: query.status }
  const skip = (query.page - 1) * query.limit

  const [items, total] = await Promise.all([
    prisma.abuseReport.findMany({
      where,
      include: reportPreviewSelect,
      orderBy: { createdAt: 'desc' },
      skip,
      take: query.limit,
    }),
    prisma.abuseReport.count({ where }),
  ])

  return { items, total }
}

export async function listAdminReports(
  query: AdminReportsQuery,
): Promise<{ items: AbuseReportRecord[]; total: number }> {
  const where: Prisma.AbuseReportWhereInput = {
    status: query.status,
    targetType: query.targetType,
    reason: query.reason,
    assignedAdminId: query.assignedAdminId,
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
    prisma.abuseReport.findMany({
      where,
      include: reportPreviewSelect,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: query.limit,
    }),
    prisma.abuseReport.count({ where }),
  ])

  return { items, total }
}

export async function updateAbuseReportStatusRecord(
  id: string,
  input: UpdateAbuseReportStatusRecordInput,
): Promise<AbuseReportRecord> {
  return prisma.abuseReport.update({
    where: { id },
    data: {
      status: input.status,
      assignedAdminId:
        input.assignedAdminId !== undefined ? input.assignedAdminId : undefined,
      resolutionNote:
        input.resolutionNote !== undefined ? input.resolutionNote : undefined,
      resolvedById: input.resolvedById !== undefined ? input.resolvedById : undefined,
      resolvedAt: input.resolvedAt !== undefined ? input.resolvedAt : undefined,
    },
    include: reportPreviewSelect,
  })
}

export async function createAbuseReportActionRecord(
  reportId: string,
  adminId: string,
  input: CreateAbuseReportActionInput,
): Promise<AbuseReportActionRecord> {
  return prisma.abuseReportAction.create({
    data: {
      reportId,
      adminId,
      actionType: input.actionType,
      note: input.note ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
    },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  })
}

export async function findSellerProfileByUserId(userId: string): Promise<{ id: string } | null> {
  return prisma.sellerProfile.findUnique({
    where: { userId },
    select: { id: true },
  })
}

export async function findReportTargetContext(
  targetType: AbuseReportTargetType,
  targetId: string,
): Promise<AbuseReportTargetContext | null> {
  switch (targetType) {
    case AbuseReportTargetType.PRODUCT: {
      const product = await prisma.product.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          name: true,
          status: true,
          store: {
            select: {
              id: true,
              name: true,
              ownerId: true,
            },
          },
        },
      })

      if (!product) return null

      return {
        targetType,
        id: product.id,
        productName: product.name,
        productStatus: product.status,
        ownerUserId: product.store.ownerId,
        storeId: product.store.id,
        storeName: product.store.name,
      }
    }
    case AbuseReportTargetType.REVIEW: {
      const review = await prisma.review.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          status: true,
          userId: true,
          title: true,
          comment: true,
          product: {
            select: {
              id: true,
              name: true,
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
      })

      if (!review) return null

      return {
        targetType,
        id: review.id,
        reviewUserId: review.userId,
        reviewStatus: review.status,
        reviewSnippet: review.title ?? review.comment ?? null,
        productId: review.product.id,
        productName: review.product.name,
        storeId: review.product.store.id,
        storeName: review.product.store.name,
        storeOwnerId: review.product.store.ownerId,
      }
    }
    case AbuseReportTargetType.STORE: {
      const store = await prisma.store.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          name: true,
          slug: true,
          ownerId: true,
          isActive: true,
        },
      })

      if (!store) return null

      return {
        targetType,
        id: store.id,
        storeName: store.name,
        storeSlug: store.slug,
        ownerUserId: store.ownerId,
        isActive: store.isActive,
      }
    }
    case AbuseReportTargetType.USER: {
      const user = await prisma.user.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          email: true,
          name: true,
          seller: {
            select: {
              id: true,
            },
          },
        },
      })

      if (!user) return null

      return {
        targetType,
        id: user.id,
        email: user.email,
        name: user.name,
        sellerProfileId: user.seller?.id ?? null,
      }
    }
    case AbuseReportTargetType.ORDER: {
      const order = await prisma.order.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          userId: true,
          status: true,
          totalAmount: true,
          items: {
            select: {
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
      })

      if (!order) return null

      const storeOwners = new Map<string, { storeId: string; storeName: string; ownerId: string }>()
      for (const item of order.items) {
        if (!storeOwners.has(item.store.id)) {
          storeOwners.set(item.store.id, {
            storeId: item.store.id,
            storeName: item.store.name,
            ownerId: item.store.ownerId,
          })
        }
      }

      return {
        targetType,
        id: order.id,
        orderUserId: order.userId,
        status: order.status,
        totalAmount: order.totalAmount,
        storeOwners: [...storeOwners.values()],
      }
    }
    default:
      return null
  }
}

export async function findAdminRecipients(): Promise<Array<{ id: string }>> {
  return prisma.user.findMany({
    where: {
      roles: {
        some: {
          role: 'ADMIN',
        },
      },
    },
    select: { id: true },
  })
}

export async function findUserById(
  userId: string,
): Promise<{ id: string; email: string; name: string | null } | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
    },
  })
}

export async function findStoreById(
  storeId: string,
): Promise<{ id: string; name: string; ownerId: string } | null> {
  return prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  })
}

export async function updateStoreActiveState(storeId: string, isActive: boolean): Promise<void> {
  await prisma.store.update({
    where: { id: storeId },
    data: { isActive },
  })
}

export async function updateReportStatusAndCreateAction(
  reportId: string,
  statusInput: UpdateAbuseReportStatusRecordInput,
  adminId: string,
  actionType: AbuseReportActionType,
  note?: string | null,
  metadata?: Prisma.InputJsonValue,
): Promise<{ report: AbuseReportRecord; action: AbuseReportActionRecord }> {
  const result = await prisma.$transaction(async (tx) => {
    const report = await tx.abuseReport.update({
      where: { id: reportId },
      data: {
        status: statusInput.status,
        assignedAdminId:
          statusInput.assignedAdminId !== undefined ? statusInput.assignedAdminId : undefined,
        resolutionNote:
          statusInput.resolutionNote !== undefined ? statusInput.resolutionNote : undefined,
        resolvedById:
          statusInput.resolvedById !== undefined ? statusInput.resolvedById : undefined,
        resolvedAt: statusInput.resolvedAt !== undefined ? statusInput.resolvedAt : undefined,
      },
      include: reportPreviewSelect,
    })

    const action = await tx.abuseReportAction.create({
      data: {
        reportId,
        adminId,
        actionType,
        note: note ?? null,
      metadata: metadata ?? undefined,
      },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    return { report, action }
  })

  return result
}
