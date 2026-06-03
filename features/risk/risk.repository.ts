import type Decimal from 'decimal.js'
import {
  type RiskLevel,
  type RiskSignalType,
  type Prisma,
} from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type { RiskProfileQueryInput } from './risk.schema'

const riskProfileInclude = {
  user: {
    select: {
      id: true,
      email: true,
      name: true,
      profile: {
        select: {
          displayName: true,
        },
      },
      roles: {
        select: {
          role: true,
        },
      },
    },
  },
  store: {
    select: {
      id: true,
      name: true,
      slug: true,
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
} satisfies Prisma.RiskProfileInclude

export type RiskProfileRecord = Prisma.RiskProfileGetPayload<{
  include: typeof riskProfileInclude
}>

export type RiskSignalRecord = Prisma.RiskSignalGetPayload<{
  select: {
    id: true
    userId: true
    storeId: true
    sourceType: true
    sourceId: true
    signalType: true
    weight: true
    metadata: true
    createdAt: true
  }
}>

function buildUserRiskWhere(query: RiskProfileQueryInput): Prisma.RiskProfileWhereInput {
  return {
    userId: { not: null },
    ...(query.level ? { level: query.level } : {}),
    ...(query.search
      ? {
          user: {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              {
                profile: {
                  displayName: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          },
        }
      : {}),
  }
}

function buildStoreRiskWhere(query: RiskProfileQueryInput): Prisma.RiskProfileWhereInput {
  return {
    storeId: { not: null },
    ...(query.level ? { level: query.level } : {}),
    ...(query.search
      ? {
          store: {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
              {
                owner: {
                  email: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          },
        }
      : {}),
  }
}

export async function findExistingRiskSignal(params: {
  userId?: string | null
  storeId?: string | null
  sourceType: string
  sourceId: string
  signalType: RiskSignalType
}) {
  return prisma.riskSignal.findFirst({
    where: {
      userId: params.userId ?? null,
      storeId: params.storeId ?? null,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      signalType: params.signalType,
    },
    select: {
      id: true,
      userId: true,
      storeId: true,
      sourceType: true,
      sourceId: true,
      signalType: true,
      weight: true,
      metadata: true,
      createdAt: true,
    },
  })
}

export async function createRiskSignalRecord(input: {
  userId?: string | null
  storeId?: string | null
  sourceType: string
  sourceId: string
  signalType: RiskSignalType
  weight: Decimal
  metadata?: Prisma.InputJsonValue
}) {
  return prisma.riskSignal.create({
    data: {
      userId: input.userId ?? null,
      storeId: input.storeId ?? null,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      signalType: input.signalType,
      weight: input.weight,
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    },
    select: {
      id: true,
      userId: true,
      storeId: true,
      sourceType: true,
      sourceId: true,
      signalType: true,
      weight: true,
      metadata: true,
      createdAt: true,
    },
  })
}

export async function listRiskSignalsByUserId(userId: string): Promise<RiskSignalRecord[]> {
  return prisma.riskSignal.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      userId: true,
      storeId: true,
      sourceType: true,
      sourceId: true,
      signalType: true,
      weight: true,
      metadata: true,
      createdAt: true,
    },
  })
}

export async function listRiskSignalsByStoreId(storeId: string): Promise<RiskSignalRecord[]> {
  return prisma.riskSignal.findMany({
    where: { storeId },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      userId: true,
      storeId: true,
      sourceType: true,
      sourceId: true,
      signalType: true,
      weight: true,
      metadata: true,
      createdAt: true,
    },
  })
}

export async function findRiskProfileByUserId(userId: string): Promise<RiskProfileRecord | null> {
  return prisma.riskProfile.findUnique({
    where: { userId },
    include: riskProfileInclude,
  })
}

export async function findRiskProfileByStoreId(storeId: string): Promise<RiskProfileRecord | null> {
  return prisma.riskProfile.findUnique({
    where: { storeId },
    include: riskProfileInclude,
  })
}

export async function upsertUserRiskProfile(input: {
  userId: string
  score: Decimal
  level: RiskLevel
  lastCalculatedAt: Date
}): Promise<RiskProfileRecord> {
  return prisma.riskProfile.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      score: input.score,
      level: input.level,
      lastCalculatedAt: input.lastCalculatedAt,
    },
    update: {
      score: input.score,
      level: input.level,
      lastCalculatedAt: input.lastCalculatedAt,
    },
    include: riskProfileInclude,
  })
}

export async function upsertStoreRiskProfile(input: {
  storeId: string
  score: Decimal
  level: RiskLevel
  lastCalculatedAt: Date
}): Promise<RiskProfileRecord> {
  return prisma.riskProfile.upsert({
    where: { storeId: input.storeId },
    create: {
      storeId: input.storeId,
      score: input.score,
      level: input.level,
      lastCalculatedAt: input.lastCalculatedAt,
    },
    update: {
      score: input.score,
      level: input.level,
      lastCalculatedAt: input.lastCalculatedAt,
    },
    include: riskProfileInclude,
  })
}

export async function listUserRiskProfiles(query: RiskProfileQueryInput) {
  return prisma.riskProfile.findMany({
    where: buildUserRiskWhere(query),
    include: riskProfileInclude,
    orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })
}

export async function countUserRiskProfiles(query: RiskProfileQueryInput) {
  return prisma.riskProfile.count({
    where: buildUserRiskWhere(query),
  })
}

export async function listStoreRiskProfiles(query: RiskProfileQueryInput) {
  return prisma.riskProfile.findMany({
    where: buildStoreRiskWhere(query),
    include: riskProfileInclude,
    orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })
}

export async function countStoreRiskProfiles(query: RiskProfileQueryInput) {
  return prisma.riskProfile.count({
    where: buildStoreRiskWhere(query),
  })
}

export async function listRiskUserIdsForRecalculation(): Promise<string[]> {
  const [profileIds, signalIds] = await Promise.all([
    prisma.riskProfile.findMany({
      where: { userId: { not: null } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.riskSignal.findMany({
      where: { userId: { not: null } },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ])

  return [...new Set([...profileIds, ...signalIds].map((item) => item.userId).filter(Boolean))] as string[]
}

export async function listRiskStoreIdsForRecalculation(): Promise<string[]> {
  const [profileIds, signalIds] = await Promise.all([
    prisma.riskProfile.findMany({
      where: { storeId: { not: null } },
      select: { storeId: true },
      distinct: ['storeId'],
    }),
    prisma.riskSignal.findMany({
      where: { storeId: { not: null } },
      select: { storeId: true },
      distinct: ['storeId'],
    }),
  ])

  return [...new Set([...profileIds, ...signalIds].map((item) => item.storeId).filter(Boolean))] as string[]
}

export async function findRiskUserSubjectById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      profile: {
        select: {
          displayName: true,
        },
      },
      roles: {
        select: {
          role: true,
        },
      },
    },
  })
}

export async function findRiskStoreSubjectById(storeId: string) {
  return prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      slug: true,
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

export async function listStoresByOwnerId(ownerId: string) {
  return prisma.store.findMany({
    where: { ownerId },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  })
}
