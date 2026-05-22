import Decimal from 'decimal.js'
import { Prisma, ProductBadgeSource, ProductBadgeType, ProductStatus } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'

export type BadgeSubjectProduct = {
  id: string
  categoryId: string | null
  ownerId: string
  status: ProductStatus
  publishedAt: Date | null
  isActive: boolean
}

export type AggregatedMetricSnapshot = {
  productId: string
  viewCount: number
  wishlistCount: number
  soldCount: number
  revenueAmount: Decimal
  ratingAvg: Decimal
  reviewCount: number
}

export async function findBadgeSubjectProducts(
  params: { productIds?: string[]; page?: number; limit?: number } = {},
) {
  const { productIds, page, limit } = params

  return prisma.product.findMany({
    where: {
      ...(productIds ? { id: { in: productIds } } : {}),
    },
    select: {
      id: true,
      categoryId: true,
      store: {
        select: {
          ownerId: true,
        },
      },
      status: true,
      publishedAt: true,
      isActive: true,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(page && limit
      ? {
          skip: (page - 1) * limit,
          take: limit,
        }
      : {}),
  }).then((products) =>
    products.map((product) => ({
      id: product.id,
      categoryId: product.categoryId,
      ownerId: product.store.ownerId,
      status: product.status,
      publishedAt: product.publishedAt,
      isActive: product.isActive,
    })),
  )
}

export async function countBadgeSubjectProducts(productIds?: string[]) {
  return prisma.product.count({
    where: {
      ...(productIds ? { id: { in: productIds } } : {}),
    },
  })
}

export async function findActiveProductBadges(
  productIds: string[],
  now: Date,
  types?: ProductBadgeType[],
) {
  if (productIds.length === 0) {
    return []
  }

  return prisma.productBadge.findMany({
    where: {
      productId: { in: productIds },
      ...(types ? { type: { in: types } } : {}),
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
}

export async function findAllProductBadges(
  params: {
    productIds?: string[]
    type?: ProductBadgeType
    page: number
    limit: number
    activeOnly: boolean
    now: Date
  },
) {
  const { productIds, type, page, limit, activeOnly, now } = params

  const where: Prisma.ProductBadgeWhereInput = {
    ...(productIds ? { productId: { in: productIds } } : {}),
    ...(type ? { type } : {}),
    ...(activeOnly
      ? {
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.productBadge.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.productBadge.count({ where }),
  ])

  return { items, total }
}

export async function replaceSystemNewBadge(
  productId: string,
  publishedAt: Date | null,
  shouldPersist: boolean,
) {
  const windowEnd = publishedAt ? new Date(publishedAt.getTime() + 30 * 24 * 60 * 60 * 1000) : null

  await prisma.$transaction(async (tx) => {
    await tx.productBadge.deleteMany({
      where: {
        productId,
        type: ProductBadgeType.NEW,
        source: ProductBadgeSource.SYSTEM,
      },
    })

    if (shouldPersist && publishedAt && windowEnd) {
      await tx.productBadge.create({
        data: {
          productId,
          type: ProductBadgeType.NEW,
          source: ProductBadgeSource.SYSTEM,
          startsAt: publishedAt,
          endsAt: windowEnd,
          updatedAt: new Date(),
        },
      })
    }
  })
}

export async function replaceSystemHitBadges(
  badges: Array<{ productId: string; score: Decimal }>,
) {
  await prisma.$transaction(async (tx) => {
    await tx.productBadge.deleteMany({
      where: {
        type: ProductBadgeType.HIT,
        source: ProductBadgeSource.SYSTEM,
      },
    })

    if (badges.length === 0) {
      return
    }

    await tx.productBadge.createMany({
      data: badges.map((badge) => ({
        productId: badge.productId,
        type: ProductBadgeType.HIT,
        source: ProductBadgeSource.SYSTEM,
        score: badge.score,
        startsAt: new Date(),
        endsAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    })
  })
}

export async function upsertProductMetrics(
  snapshots: Array<AggregatedMetricSnapshot & { hitScore: Decimal; calculatedAt: Date }>,
) {
  if (snapshots.length === 0) {
    return
  }

  await prisma.$transaction(
    snapshots.map((snapshot) =>
      prisma.productMetrics.upsert({
        where: { productId: snapshot.productId },
        create: {
          productId: snapshot.productId,
          viewCount: snapshot.viewCount,
          wishlistCount: snapshot.wishlistCount,
          soldCount: snapshot.soldCount,
          revenueAmount: snapshot.revenueAmount,
          ratingAvg: snapshot.ratingAvg,
          reviewCount: snapshot.reviewCount,
          hitScore: snapshot.hitScore,
          lastCalculatedAt: snapshot.calculatedAt,
          createdAt: snapshot.calculatedAt,
          updatedAt: snapshot.calculatedAt,
        },
        update: {
          viewCount: snapshot.viewCount,
          wishlistCount: snapshot.wishlistCount,
          soldCount: snapshot.soldCount,
          revenueAmount: snapshot.revenueAmount,
          ratingAvg: snapshot.ratingAvg,
          reviewCount: snapshot.reviewCount,
          hitScore: snapshot.hitScore,
          lastCalculatedAt: snapshot.calculatedAt,
          updatedAt: snapshot.calculatedAt,
        },
      }),
    ),
  )
}

export async function findProductMetrics(
  params: { productId?: string; page: number; limit: number },
) {
  const where: Prisma.ProductMetricsWhereInput = params.productId
    ? { productId: params.productId }
    : {}

  const [items, total] = await Promise.all([
    prisma.productMetrics.findMany({
      where,
      orderBy: [{ hitScore: 'desc' }, { soldCount: 'desc' }, { productId: 'asc' }],
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.productMetrics.count({ where }),
  ])

  return { items, total }
}

export async function findProductByIdForBadgeMutation(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      status: true,
      isActive: true,
      publishedAt: true,
    },
  })
}

export async function findActiveBadgeConflict(params: {
  productId: string
  type: ProductBadgeType
  source: ProductBadgeSource
  startsAt: Date | null
  endsAt: Date | null
}) {
  const now = params.startsAt ?? new Date()

  return prisma.productBadge.findFirst({
    where: {
      productId: params.productId,
      type: params.type,
      source: params.source,
      OR: [{ startsAt: null }, { startsAt: { lte: params.endsAt ?? now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: params.startsAt ?? now } }] }],
    },
  })
}

export async function createAdminProductBadge(params: {
  productId: string
  type: Extract<ProductBadgeType, 'HIT' | 'FEATURED'>
  startsAt: Date | null
  endsAt: Date | null
  score: Decimal | null
}) {
  return prisma.productBadge.create({
    data: {
      productId: params.productId,
      type: params.type,
      source: ProductBadgeSource.ADMIN,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      score: params.score,
      updatedAt: new Date(),
    },
  })
}

export async function findProductBadgeById(productId: string, badgeId: string) {
  return prisma.productBadge.findFirst({
    where: {
      id: badgeId,
      productId,
    },
  })
}

export async function deleteProductBadge(badgeId: string) {
  await prisma.productBadge.delete({
    where: { id: badgeId },
  })
}

export async function aggregateViewCounts(productIds: string[]) {
  if (productIds.length === 0) {
    return new Map<string, number>()
  }

  const rows = await prisma.$queryRaw<Array<{ productId: string; viewCount: bigint }>>(
    Prisma.sql`
      SELECT
        vp.product_id AS "productId",
        COUNT(*) AS "viewCount"
      FROM viewed_products vp
      INNER JOIN products p ON p.id = vp.product_id
      INNER JOIN stores s ON s.id = p.store_id
      WHERE vp.product_id IN (${Prisma.join(productIds)})
        AND (vp.user_id IS NULL OR vp.user_id <> s.owner_id)
      GROUP BY vp.product_id
    `,
  )

  return new Map(rows.map((row) => [row.productId, Number(row.viewCount)]))
}

export async function aggregateWishlistCounts(productIds: string[]) {
  if (productIds.length === 0) {
    return new Map<string, number>()
  }

  const rows = await prisma.$queryRaw<Array<{ productId: string; wishlistCount: bigint }>>(
    Prisma.sql`
      SELECT
        wi.product_id AS "productId",
        COUNT(*) AS "wishlistCount"
      FROM wishlist_items wi
      INNER JOIN wishlists w ON w.id = wi.wishlist_id
      INNER JOIN products p ON p.id = wi.product_id
      INNER JOIN stores s ON s.id = p.store_id
      WHERE wi.product_id IN (${Prisma.join(productIds)})
        AND w.user_id <> s.owner_id
      GROUP BY wi.product_id
    `,
  )

  return new Map(rows.map((row) => [row.productId, Number(row.wishlistCount)]))
}

export async function aggregateReviewStats(productIds: string[]) {
  if (productIds.length === 0) {
    return new Map<string, { reviewCount: number; ratingAvg: Decimal }>()
  }

  const rows = await prisma.$queryRaw<Array<{ productId: string; reviewCount: bigint; ratingAvg: Prisma.Decimal | null }>>(
    Prisma.sql`
      SELECT
        r.product_id AS "productId",
        COUNT(*) AS "reviewCount",
        AVG(r.rating)::numeric AS "ratingAvg"
      FROM reviews r
      INNER JOIN products p ON p.id = r.product_id
      INNER JOIN stores s ON s.id = p.store_id
      WHERE r.product_id IN (${Prisma.join(productIds)})
        AND r.user_id <> s.owner_id
      GROUP BY r.product_id
    `,
  )

  return new Map(
    rows.map((row) => [
      row.productId,
      {
        reviewCount: Number(row.reviewCount),
        ratingAvg: new Decimal(row.ratingAvg ?? 0).toDecimalPlaces(2),
      },
    ]),
  )
}

export async function aggregateSalesStats(productIds: string[]) {
  if (productIds.length === 0) {
    return new Map<string, { soldCount: number; revenueAmount: Decimal }>()
  }

  const rows = await prisma.$queryRaw<Array<{ productId: string; soldCount: bigint; revenueAmount: Prisma.Decimal }>>(
    Prisma.sql`
      SELECT
        pv.product_id AS "productId",
        COALESCE(SUM(oi.quantity), 0) AS "soldCount",
        COALESCE(SUM(oi.unit_price_snapshot * oi.quantity), 0) AS "revenueAmount"
      FROM order_items oi
      INNER JOIN product_variants pv ON pv.id = oi.variant_id
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN products p ON p.id = pv.product_id
      INNER JOIN stores s ON s.id = p.store_id
      WHERE pv.product_id IN (${Prisma.join(productIds)})
        AND o.status IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered')
        AND o.user_id <> s.owner_id
      GROUP BY pv.product_id
    `,
  )

  return new Map(
    rows.map((row) => [
      row.productId,
      {
        soldCount: Number(row.soldCount),
        revenueAmount: new Decimal(row.revenueAmount ?? 0).toDecimalPlaces(2),
      },
    ]),
  )
}
