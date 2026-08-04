import {
  type HeroBannerDestinationType,
  type HeroBannerStatus,
  Prisma,
} from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import {
  resolveRepositoryClient,
  type RepositoryContext,
} from '@/lib/repository/context'

export const heroBannerInclude = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  product: {
    select: {
      id: true,
      name: true,
    },
  },
  store: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  promotion: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} satisfies Prisma.HeroBannerInclude

export type HeroBannerRecord = Prisma.HeroBannerGetPayload<{
  include: typeof heroBannerInclude
}>

type HeroBannerAdminQuery = {
  page: number
  limit: number
  status?: HeroBannerStatus
  destinationType?: HeroBannerDestinationType
}

function buildHeroBannerWhere(query: HeroBannerAdminQuery): Prisma.HeroBannerWhereInput {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.destinationType ? { destinationType: query.destinationType } : {}),
  }
}

export async function listActiveHeroBanners(input: { now: Date; limit: number }) {
  return prisma.heroBanner.findMany({
    where: {
      status: 'PUBLISHED',
      publishStartAt: {
        lte: input.now,
      },
      OR: [{ publishEndAt: null }, { publishEndAt: { gt: input.now } }],
    },
    include: heroBannerInclude,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
    take: input.limit,
  })
}

export async function listAdminHeroBanners(query: HeroBannerAdminQuery) {
  return prisma.heroBanner.findMany({
    where: buildHeroBannerWhere(query),
    include: heroBannerInclude,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })
}

export async function countAdminHeroBanners(query: HeroBannerAdminQuery) {
  return prisma.heroBanner.count({
    where: buildHeroBannerWhere(query),
  })
}

export async function findHeroBannerById(id: string) {
  return prisma.heroBanner.findUnique({
    where: { id },
    include: heroBannerInclude,
  })
}

export async function findHeroBannersByIds(ids: string[]) {
  return prisma.heroBanner.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    select: {
      id: true,
    },
  })
}

export async function createHeroBanner(data: Prisma.HeroBannerUncheckedCreateInput) {
  return prisma.heroBanner.create({
    data,
    include: heroBannerInclude,
  })
}

export async function updateHeroBanner(
  id: string,
  data: Prisma.HeroBannerUncheckedUpdateInput,
) {
  return prisma.heroBanner.update({
    where: { id },
    data,
    include: heroBannerInclude,
  })
}

export async function deleteHeroBanner(id: string) {
  return prisma.heroBanner.delete({
    where: { id },
  })
}

export async function updateHeroBannerSortOrders(
  items: Array<{ id: string; sortOrder: number }>,
  context?: RepositoryContext,
) {
  const db = resolveRepositoryClient(context)
  const banners = []
  for (const item of items) {
    banners.push(
      await db.heroBanner.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      }),
    )
  }
  return banners
}

export async function categoryExists(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    select: { id: true },
  })
  return category != null
}

export async function productExists(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  })
  return product != null
}

export async function storeExists(id: string) {
  const store = await prisma.store.findUnique({
    where: { id },
    select: { id: true },
  })
  return store != null
}

export async function promotionExists(id: string) {
  const promotion = await prisma.promotion.findUnique({
    where: { id },
    select: { id: true },
  })
  return promotion != null
}
