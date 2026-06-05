import Decimal from 'decimal.js'
import {
  PayoutStatus,
  Prisma,
  SellerLedgerEntryStatus,
  SellerLedgerEntryType,
} from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { DuplicateLedgerEntryError } from '@/lib/errors/payout'
import type {
  AdminPayoutQueryDto,
  AdminSellerBalanceQueryDto,
  SellerLedgerQueryDto,
  SellerPayoutQueryDto,
} from './payouts.dto'

const sellerBalanceInclude = {
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
} satisfies Prisma.SellerBalanceInclude

const payoutInclude = {
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
  items: {
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.PayoutInclude

function buildDateRangeFilter(dateFrom?: string, dateTo?: string): Prisma.DateTimeFilter | undefined {
  if (!dateFrom && !dateTo) {
    return undefined
  }

  return {
    ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
    ...(dateTo ? { lte: new Date(dateTo) } : {}),
  }
}

export async function findOrderById(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      items: {
        select: {
          id: true,
          quantity: true,
          storeId: true,
          unitPriceSnapshot: true,
          variant: {
            select: {
              product: {
                select: {
                  categoryId: true,
                },
              },
            },
          },
          store: {
            select: {
              id: true,
              ownerId: true,
              name: true,
            },
          },
          platformCommission: {
            select: {
              id: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export async function createSellerFinanceEntriesForOrderItems(input: {
  items: Array<{
    orderItemId: string
    storeId: string
    sellerId: string
    grossAmount: Decimal
    commissionRate: Decimal
    commissionAmount: Decimal
    sellerNetAmount: Decimal
    currency: string
    description: string
    availableAt: Date
  }>
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      for (const item of input.items) {
        await tx.platformCommission.create({
          data: {
            orderItemId: item.orderItemId,
            storeId: item.storeId,
            sellerId: item.sellerId,
            grossAmount: item.grossAmount,
            commissionRate: item.commissionRate,
            commissionAmount: item.commissionAmount,
            sellerNetAmount: item.sellerNetAmount,
            currency: item.currency,
          },
        })

        await tx.sellerLedgerEntry.create({
          data: {
            storeId: item.storeId,
            sellerId: item.sellerId,
            orderItemId: item.orderItemId,
            type: SellerLedgerEntryType.CREDIT,
            status: SellerLedgerEntryStatus.PENDING,
            amount: item.sellerNetAmount,
            currency: item.currency,
            description: item.description,
            availableAt: item.availableAt,
          },
        })
      }
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new DuplicateLedgerEntryError()
    }

    throw error
  }
}

export async function listSellerBalancesByOwnerId(ownerId: string, storeId?: string) {
  return prisma.sellerBalance.findMany({
    where: {
      sellerId: ownerId,
      ...(storeId ? { storeId } : {}),
    },
    include: sellerBalanceInclude,
    orderBy: [{ store: { name: 'asc' } }],
  })
}

export async function listSellerOwnedStoreIds(ownerId: string) {
  const stores = await prisma.store.findMany({
    where: { ownerId },
    select: { id: true },
  })

  return stores.map((store) => store.id)
}

export async function findOwnedStoreById(ownerId: string, storeId: string) {
  return prisma.store.findFirst({
    where: {
      id: storeId,
      ownerId,
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  })
}

export async function listSellerLedgerEntriesByOwnerId(ownerId: string, query: SellerLedgerQueryDto) {
  const createdAt = buildDateRangeFilter(query.dateFrom, query.dateTo)

  return prisma.sellerLedgerEntry.findMany({
    where: {
      sellerId: ownerId,
      ...(query.storeId ? { storeId: query.storeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(createdAt ? { createdAt } : {}),
    },
    include: {
      store: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })
}

export async function countSellerLedgerEntriesByOwnerId(ownerId: string, query: SellerLedgerQueryDto) {
  const createdAt = buildDateRangeFilter(query.dateFrom, query.dateTo)

  return prisma.sellerLedgerEntry.count({
    where: {
      sellerId: ownerId,
      ...(query.storeId ? { storeId: query.storeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(createdAt ? { createdAt } : {}),
    },
  })
}

export async function listSellerPayoutsByOwnerId(ownerId: string, query: SellerPayoutQueryDto) {
  const createdAt = buildDateRangeFilter(query.dateFrom, query.dateTo)

  return prisma.payout.findMany({
    where: {
      sellerId: ownerId,
      ...(query.storeId ? { storeId: query.storeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(createdAt ? { createdAt } : {}),
    },
    include: payoutInclude,
    orderBy: [{ createdAt: 'desc' }],
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })
}

export async function countSellerPayoutsByOwnerId(ownerId: string, query: SellerPayoutQueryDto) {
  const createdAt = buildDateRangeFilter(query.dateFrom, query.dateTo)

  return prisma.payout.count({
    where: {
      sellerId: ownerId,
      ...(query.storeId ? { storeId: query.storeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(createdAt ? { createdAt } : {}),
    },
  })
}

export async function findPayoutById(id: string) {
  return prisma.payout.findUnique({
    where: { id },
    include: payoutInclude,
  })
}

export async function listAdminPayouts(query: AdminPayoutQueryDto) {
  const createdAt = buildDateRangeFilter(query.dateFrom, query.dateTo)

  return prisma.payout.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.storeId ? { storeId: query.storeId } : {}),
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
      ...(createdAt ? { createdAt } : {}),
    },
    include: payoutInclude,
    orderBy: [{ createdAt: 'desc' }],
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })
}

export async function countAdminPayouts(query: AdminPayoutQueryDto) {
  const createdAt = buildDateRangeFilter(query.dateFrom, query.dateTo)

  return prisma.payout.count({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.storeId ? { storeId: query.storeId } : {}),
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
      ...(createdAt ? { createdAt } : {}),
    },
  })
}

export async function listAdminSellerBalances(query: AdminSellerBalanceQueryDto) {
  return prisma.sellerBalance.findMany({
    where: {
      ...(query.storeId ? { storeId: query.storeId } : {}),
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
    },
    include: sellerBalanceInclude,
    orderBy: [{ updatedAt: 'desc' }],
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })
}

export async function countAdminSellerBalances(query: AdminSellerBalanceQueryDto) {
  return prisma.sellerBalance.count({
    where: {
      ...(query.storeId ? { storeId: query.storeId } : {}),
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
    },
  })
}

export async function findSellerBalanceByStoreId(storeId: string) {
  return prisma.sellerBalance.findUnique({
    where: { storeId },
    include: sellerBalanceInclude,
  })
}

export async function findStoreFinanceContextById(storeId: string) {
  return prisma.store.findUnique({
    where: { id: storeId },
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
  })
}

export async function listReservableLedgerEntriesByStoreId(storeId: string) {
  return prisma.sellerLedgerEntry.findMany({
    where: {
      storeId,
      status: SellerLedgerEntryStatus.AVAILABLE,
      payoutId: null,
    },
    orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })
}

export async function createManualPayout(input: {
  amount: Decimal
  method: 'MANUAL' | 'BANK_TRANSFER'
  storeId: string
  sellerId: string
  currency: string
  createdById: string
  reference?: string | null
  adminNote?: string | null
  ledgerEntryIds: string[]
}) {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.payout.create({
      data: {
        storeId: input.storeId,
        sellerId: input.sellerId,
        amount: input.amount,
        currency: input.currency,
        method: input.method,
        status: PayoutStatus.PENDING,
        reference: input.reference ?? null,
        adminNote: input.adminNote ?? null,
        createdById: input.createdById,
      },
      include: payoutInclude,
    })

    for (const ledgerEntryId of input.ledgerEntryIds) {
      const ledgerEntry = await tx.sellerLedgerEntry.update({
        where: { id: ledgerEntryId },
        data: {
          payoutId: payout.id,
        },
      })

      await tx.payoutItem.create({
        data: {
          payoutId: payout.id,
          ledgerEntryId: ledgerEntry.id,
          amount: ledgerEntry.amount,
        },
      })
    }

    return payout
  })
}

export async function updatePayoutStatus(input: {
  payoutId: string
  status: PayoutStatus
  adminNote?: string | null
  reference?: string | null
  paidAt?: Date | null
  failedAt?: Date | null
}) {
  return prisma.payout.update({
    where: { id: input.payoutId },
    data: {
      status: input.status,
      ...(input.adminNote !== undefined ? { adminNote: input.adminNote } : {}),
      ...(input.reference !== undefined ? { reference: input.reference } : {}),
      ...(input.paidAt !== undefined ? { paidAt: input.paidAt } : {}),
      ...(input.failedAt !== undefined ? { failedAt: input.failedAt } : {}),
    },
    include: payoutInclude,
  })
}

export async function markPayoutLedgerEntriesPaidOut(payoutId: string) {
  await prisma.sellerLedgerEntry.updateMany({
    where: { payoutId },
    data: {
      status: SellerLedgerEntryStatus.PAID_OUT,
    },
  })
}

export async function releasePayoutLedgerEntries(payoutId: string) {
  await prisma.sellerLedgerEntry.updateMany({
    where: { payoutId },
    data: {
      payoutId: null,
      status: SellerLedgerEntryStatus.AVAILABLE,
    },
  })
}

export async function releaseEligiblePendingLedgerEntries(filter?: {
  sellerId?: string
  storeId?: string
}) {
  const result = await prisma.sellerLedgerEntry.updateMany({
    where: {
      status: SellerLedgerEntryStatus.PENDING,
      availableAt: { lte: new Date() },
      ...(filter?.sellerId ? { sellerId: filter.sellerId } : {}),
      ...(filter?.storeId ? { storeId: filter.storeId } : {}),
    },
    data: {
      status: SellerLedgerEntryStatus.AVAILABLE,
    },
  })

  return result.count
}

export async function getLedgerBalanceTotalsByStoreId(storeId: string) {
  const entries = await prisma.sellerLedgerEntry.findMany({
    where: { storeId },
    select: {
      amount: true,
      payoutId: true,
      status: true,
    },
  })

  return entries.reduce(
    (totals, entry) => {
      const amount = new Decimal(entry.amount.toString())

      if (entry.status === SellerLedgerEntryStatus.PENDING) {
        totals.pendingAmount = totals.pendingAmount.plus(amount)
      } else if (entry.status === SellerLedgerEntryStatus.AVAILABLE && entry.payoutId == null) {
        totals.availableAmount = totals.availableAmount.plus(amount)
      } else if (entry.status === SellerLedgerEntryStatus.PAID_OUT) {
        totals.paidOutAmount = totals.paidOutAmount.plus(amount)
      }

      return totals
    },
    {
      pendingAmount: new Decimal(0),
      availableAmount: new Decimal(0),
      paidOutAmount: new Decimal(0),
    },
  )
}

export async function upsertSellerBalance(input: {
  storeId: string
  sellerId: string
  currency: string
  pendingAmount: Decimal
  availableAmount: Decimal
  paidOutAmount: Decimal
}) {
  return prisma.sellerBalance.upsert({
    where: { storeId: input.storeId },
    update: {
      sellerId: input.sellerId,
      currency: input.currency,
      pendingAmount: input.pendingAmount,
      availableAmount: input.availableAmount,
      paidOutAmount: input.paidOutAmount,
    },
    create: {
      storeId: input.storeId,
      sellerId: input.sellerId,
      currency: input.currency,
      pendingAmount: input.pendingAmount,
      availableAmount: input.availableAmount,
      paidOutAmount: input.paidOutAmount,
    },
    include: sellerBalanceInclude,
  })
}

export async function findPayoutEmailContext(payoutId: string) {
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
