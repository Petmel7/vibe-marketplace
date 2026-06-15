import { prisma } from '@/lib/prisma'
import type {
  Category,
  Product,
  ProductBadgeType,
  ProductImage,
  ProductVariant,
  Store,
} from '@/app/generated/prisma/client'
import { Prisma } from '@/app/generated/prisma/client'

type ProductImagePreview = Pick<ProductImage, 'id' | 'url' | 'isPrimary' | 'position' | 'createdAt'>
type ProductImageDetailPreview = Pick<
  ProductImage,
  'id' | 'url' | 'altText' | 'isPrimary' | 'position' | 'createdAt'
>
type ProductRatingSummaryPreview = Pick<
  Prisma.ProductRatingSummaryGetPayload<{
    select: {
      productId: true
      ratingAvg: true
      ratingCount: true
      rating1Count: true
      rating2Count: true
      rating3Count: true
      rating4Count: true
      rating5Count: true
      updatedAt: true
    }
  }>,
  | 'productId'
  | 'ratingAvg'
  | 'ratingCount'
  | 'rating1Count'
  | 'rating2Count'
  | 'rating3Count'
  | 'rating4Count'
  | 'rating5Count'
  | 'updatedAt'
>
type ProductListStorePreview = Pick<Store, 'id' | 'name' | 'slug'>
type ProductListVariantPreview = Pick<ProductVariant, 'id' | 'sku' | 'price' | 'stock'>

export type ProductWithVariants = Product & { variants: ProductVariant[]; images: ProductImagePreview[] }
export type CategoryNode = Pick<Category, 'id' | 'parentId'>
export type ProductDetailProduct = Product & {
  variants: ProductVariant[]
  images: ProductImageDetailPreview[]
  ratingSummary: ProductRatingSummaryPreview | null
  store: Pick<Prisma.StoreGetPayload<{ select: { name: true; slug: true } }>, 'name' | 'slug'>
  category: Pick<Prisma.CategoryGetPayload<{ select: { name: true; slug: true } }>, 'name' | 'slug'> | null
}

const PRODUCT_LIST_SELECT = {
  id: true,
  storeId: true,
  categoryId: true,
  name: true,
  description: true,
  price: true,
  imageUrl: true,
  isActive: true,
  sku: true,
  isHit: true,
  isNew: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  variants: {
    select: {
      id: true,
      sku: true,
      price: true,
      stock: true,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  images: {
    select: {
      id: true,
      url: true,
      isPrimary: true,
      position: true,
      createdAt: true,
    },
    orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  },
  store: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  ratingSummary: {
    select: {
      productId: true,
      ratingAvg: true,
      ratingCount: true,
      rating1Count: true,
      rating2Count: true,
      rating3Count: true,
      rating4Count: true,
      rating5Count: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.ProductSelect

export type ProductListProduct = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_LIST_SELECT
}>

interface FindProductsParams {
  where: Prisma.ProductWhereInput
  orderBy: Prisma.ProductOrderByWithRelationInput[]
  page: number
  limit: number
}

interface FindProductsResult {
  items: ProductListProduct[]
  total: number
}

interface FindProductCardsParams {
  where: Prisma.ProductWhereInput
  orderBy: Prisma.ProductOrderByWithRelationInput[]
  limit: number
}

export interface ProductSearchRepositoryParams {
  q?: string
  categoryIds?: string[]
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  rating?: number
  badge?: ProductBadgeType
  store?: {
    id?: string
    slug?: string
  }
  sort: 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'popular'
  page: number
  limit: number
}

export interface ProductSearchFacetCategoryRecord {
  id: string
  slug: string
  name: string
  count: number
}

export interface ProductSearchFacetStoreRecord {
  id: string
  slug: string
  name: string
  count: number
}

export interface ProductSearchFacetRatingRecord {
  minRating: number
  count: number
}

export interface ProductSearchFacetBadgeRecord {
  type: ProductBadgeType
  count: number
}

export interface ProductSearchFacetsRecord {
  categories: ProductSearchFacetCategoryRecord[]
  stores: ProductSearchFacetStoreRecord[]
  availability: {
    inStock: number
    outOfStock: number
  }
  ratings: ProductSearchFacetRatingRecord[]
  badges: ProductSearchFacetBadgeRecord[]
  priceRange: {
    min: Prisma.Decimal | null
    max: Prisma.Decimal | null
  }
}

export interface ProductSearchRepositoryResult {
  items: ProductListProduct[]
  total: number
  page: number
  limit: number
  facets: ProductSearchFacetsRecord
}

/**
 * Return a paginated list of active products using service-composed filters.
 *
 * The service owns business decisions like category-tree resolution,
 * filter composition, and sort mapping. The repository only executes Prisma
 * queries using those prepared Prisma inputs.
 */
export async function findProducts(
  params: FindProductsParams
): Promise<FindProductsResult> {
  const { where, orderBy, page, limit } = params
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: PRODUCT_LIST_SELECT,
    }),
    prisma.product.count({ where }),
  ])

  return { items, total }
}

export async function findProductCards(
  params: FindProductCardsParams
): Promise<ProductListProduct[]> {
  const { where, orderBy, limit } = params

  return prisma.product.findMany({
    where,
    take: limit,
    orderBy,
    select: PRODUCT_LIST_SELECT,
  })
}

type ProductIdRow = { id: string }
type CountRow = { count: bigint }
type CategoryFacetRow = { id: string; slug: string; name: string; count: bigint }
type StoreFacetRow = { id: string; slug: string; name: string; count: bigint }
type AvailabilityFacetRow = { inStock: bigint; outOfStock: bigint }
type RatingFacetCountRow = { count: bigint }
type BadgeFacetRow = { type: ProductBadgeType; count: bigint }
type PriceRangeRow = { min: Prisma.Decimal | null; max: Prisma.Decimal | null }

function buildPublicSearchWhereSql(params: ProductSearchRepositoryParams): Prisma.Sql {
  const clauses: Prisma.Sql[] = [
    Prisma.sql`p."is_active" = true`,
    Prisma.sql`p."status" = 'PUBLISHED'`,
    Prisma.sql`s."is_active" = true`,
    Prisma.sql`(p."category_id" IS NULL OR c."is_active" = true)`,
  ]

  const query = params.q?.trim()
  if (query) {
    clauses.push(Prisma.sql`p."search_vector" @@ plainto_tsquery('english', ${query})`)
  }

  if (params.categoryIds?.length) {
    clauses.push(Prisma.sql`p."category_id" IN (${Prisma.join(params.categoryIds)})`)
  }

  if (params.minPrice !== undefined) {
    clauses.push(Prisma.sql`p."price" >= ${params.minPrice}`)
  }

  if (params.maxPrice !== undefined) {
    clauses.push(Prisma.sql`p."price" <= ${params.maxPrice}`)
  }

  if (params.inStock === true) {
    clauses.push(
      Prisma.sql`EXISTS (
        SELECT 1
        FROM "public"."product_variants" pv
        WHERE pv."product_id" = p."id"
          AND pv."stock" > 0
      )`,
    )
  }

  if (params.inStock === false) {
    clauses.push(
      Prisma.sql`NOT EXISTS (
        SELECT 1
        FROM "public"."product_variants" pv
        WHERE pv."product_id" = p."id"
          AND pv."stock" > 0
      )`,
    )
  }

  if (params.rating !== undefined) {
    clauses.push(Prisma.sql`COALESCE(prs."rating_avg", 0) >= ${params.rating}`)
  }

  if (params.badge) {
    clauses.push(
      Prisma.sql`EXISTS (
        SELECT 1
        FROM "public"."product_badges" pb
        WHERE pb."product_id" = p."id"
          AND pb."type" = ${params.badge}::"ProductBadgeType"
          AND (pb."starts_at" IS NULL OR pb."starts_at" <= CURRENT_TIMESTAMP)
          AND (pb."ends_at" IS NULL OR pb."ends_at" > CURRENT_TIMESTAMP)
      )`,
    )
  }

  if (params.store?.id) {
    clauses.push(Prisma.sql`p."store_id" = ${params.store.id}::uuid`)
  }

  if (params.store?.slug) {
    clauses.push(Prisma.sql`s."slug" = ${params.store.slug}`)
  }

  return Prisma.sql`${Prisma.join(clauses, ' AND ')}`
}

function buildSearchOrderBySql(params: ProductSearchRepositoryParams): Prisma.Sql {
  if (params.sort === 'price_asc') {
    return Prisma.sql`fp."price" ASC, fp."created_at" DESC, fp."id" DESC`
  }

  if (params.sort === 'price_desc') {
    return Prisma.sql`fp."price" DESC, fp."created_at" DESC, fp."id" DESC`
  }

  if (params.sort === 'rating') {
    return Prisma.sql`fp."rating_avg" DESC, fp."rating_count" DESC, fp."created_at" DESC, fp."id" DESC`
  }

  if (params.sort === 'popular') {
    return Prisma.sql`fp."hit_score" DESC, fp."sold_count" DESC, fp."wishlist_count" DESC, fp."view_count" DESC, fp."created_at" DESC, fp."id" DESC`
  }

  if (params.sort === 'relevance' && params.q?.trim()) {
    return Prisma.sql`fp."rank" DESC NULLS LAST, fp."created_at" DESC, fp."id" DESC`
  }

  return Prisma.sql`fp."created_at" DESC, fp."id" DESC`
}

function buildFilteredProductsCte(params: ProductSearchRepositoryParams): Prisma.Sql {
  const query = params.q?.trim()
  const whereSql = buildPublicSearchWhereSql(params)

  return Prisma.sql`
    WITH filtered_products AS (
      SELECT
        p."id",
        p."category_id",
        p."store_id",
        p."price",
        p."created_at",
        p."published_at",
        COALESCE(prs."rating_avg", 0) AS "rating_avg",
        COALESCE(prs."rating_count", 0) AS "rating_count",
        COALESCE(pm."hit_score", 0) AS "hit_score",
        COALESCE(pm."sold_count", 0) AS "sold_count",
        COALESCE(pm."wishlist_count", 0) AS "wishlist_count",
        COALESCE(pm."view_count", 0) AS "view_count",
        EXISTS (
          SELECT 1
          FROM "public"."product_variants" pv
          WHERE pv."product_id" = p."id"
            AND pv."stock" > 0
        ) AS "in_stock",
        ${query
          ? Prisma.sql`ts_rank(p."search_vector", plainto_tsquery('english', ${query}))`
          : Prisma.sql`NULL::real`} AS "rank"
      FROM "public"."products" p
      INNER JOIN "public"."stores" s ON s."id" = p."store_id"
      LEFT JOIN "public"."categories" c ON c."id" = p."category_id"
      LEFT JOIN "public"."product_rating_summaries" prs ON prs."product_id" = p."id"
      LEFT JOIN "public"."product_metrics" pm ON pm."product_id" = p."id"
      WHERE ${whereSql}
    )
  `
}

async function findProductsByIdsInOrder(ids: string[]): Promise<ProductListProduct[]> {
  if (ids.length === 0) {
    return []
  }

  const items = await prisma.product.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    select: PRODUCT_LIST_SELECT,
  })

  const itemsById = new Map(items.map((item) => [item.id, item]))
  return ids.map((id) => itemsById.get(id)).filter((item): item is ProductListProduct => Boolean(item))
}

/**
 * Public search with FTS, filters, facets, and sort options.
 */
export async function searchProducts(
  params: ProductSearchRepositoryParams
): Promise<ProductSearchRepositoryResult> {
  const skip = (params.page - 1) * params.limit
  const cte = buildFilteredProductsCte(params)
  const orderBySql = buildSearchOrderBySql(params)

  const [
    itemIdRows,
    totalRows,
    categoryRows,
    storeRows,
    availabilityRows,
    badgeRows,
    priceRows,
    rating5Rows,
    rating4Rows,
    rating3Rows,
    rating2Rows,
    rating1Rows,
  ] = await Promise.all([
    prisma.$queryRaw<ProductIdRow[]>`
      ${cte}
      SELECT fp."id"
      FROM filtered_products fp
      ORDER BY ${orderBySql}
      LIMIT ${params.limit} OFFSET ${skip}
    `,
    prisma.$queryRaw<CountRow[]>`
      ${cte}
      SELECT COUNT(*) AS count
      FROM filtered_products
    `,
    prisma.$queryRaw<CategoryFacetRow[]>`
      ${cte}
      SELECT
        c."id",
        c."slug",
        c."name",
        COUNT(*) AS count
      FROM filtered_products fp
      INNER JOIN "public"."categories" c ON c."id" = fp."category_id"
      GROUP BY c."id", c."slug", c."name"
      ORDER BY COUNT(*) DESC, c."name" ASC
    `,
    prisma.$queryRaw<StoreFacetRow[]>`
      ${cte}
      SELECT
        s."id",
        s."slug",
        s."name",
        COUNT(*) AS count
      FROM filtered_products fp
      INNER JOIN "public"."stores" s ON s."id" = fp."store_id"
      GROUP BY s."id", s."slug", s."name"
      ORDER BY COUNT(*) DESC, s."name" ASC
    `,
    prisma.$queryRaw<AvailabilityFacetRow[]>`
      ${cte}
      SELECT
        COUNT(*) FILTER (WHERE fp."in_stock" = true) AS "inStock",
        COUNT(*) FILTER (WHERE fp."in_stock" = false) AS "outOfStock"
      FROM filtered_products fp
    `,
    prisma.$queryRaw<BadgeFacetRow[]>`
      ${cte}
      SELECT
        pb."type",
        COUNT(DISTINCT pb."product_id") AS count
      FROM filtered_products fp
      INNER JOIN "public"."product_badges" pb ON pb."product_id" = fp."id"
      WHERE (pb."starts_at" IS NULL OR pb."starts_at" <= CURRENT_TIMESTAMP)
        AND (pb."ends_at" IS NULL OR pb."ends_at" > CURRENT_TIMESTAMP)
      GROUP BY pb."type"
      ORDER BY COUNT(DISTINCT pb."product_id") DESC, pb."type" ASC
    `,
    prisma.$queryRaw<PriceRangeRow[]>`
      ${cte}
      SELECT
        MIN(fp."price") AS min,
        MAX(fp."price") AS max
      FROM filtered_products fp
    `,
    prisma.$queryRaw<RatingFacetCountRow[]>`${cte} SELECT COUNT(*) AS count FROM filtered_products fp WHERE fp."rating_avg" >= 5`,
    prisma.$queryRaw<RatingFacetCountRow[]>`${cte} SELECT COUNT(*) AS count FROM filtered_products fp WHERE fp."rating_avg" >= 4`,
    prisma.$queryRaw<RatingFacetCountRow[]>`${cte} SELECT COUNT(*) AS count FROM filtered_products fp WHERE fp."rating_avg" >= 3`,
    prisma.$queryRaw<RatingFacetCountRow[]>`${cte} SELECT COUNT(*) AS count FROM filtered_products fp WHERE fp."rating_avg" >= 2`,
    prisma.$queryRaw<RatingFacetCountRow[]>`${cte} SELECT COUNT(*) AS count FROM filtered_products fp WHERE fp."rating_avg" >= 1`,
  ])

  const ids = itemIdRows.map((row) => row.id)
  const items = await findProductsByIdsInOrder(ids)

  return {
    items,
    total: Number(totalRows[0]?.count ?? BigInt(0)),
    page: params.page,
    limit: params.limit,
    facets: {
      categories: categoryRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        count: Number(row.count),
      })),
      stores: storeRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        count: Number(row.count),
      })),
      availability: {
        inStock: Number(availabilityRows[0]?.inStock ?? BigInt(0)),
        outOfStock: Number(availabilityRows[0]?.outOfStock ?? BigInt(0)),
      },
      ratings: [
        { minRating: 5, count: Number(rating5Rows[0]?.count ?? BigInt(0)) },
        { minRating: 4, count: Number(rating4Rows[0]?.count ?? BigInt(0)) },
        { minRating: 3, count: Number(rating3Rows[0]?.count ?? BigInt(0)) },
        { minRating: 2, count: Number(rating2Rows[0]?.count ?? BigInt(0)) },
        { minRating: 1, count: Number(rating1Rows[0]?.count ?? BigInt(0)) },
      ],
      badges: badgeRows.map((row) => ({
        type: row.type,
        count: Number(row.count),
      })),
      priceRange: {
        min: priceRows[0]?.min ?? null,
        max: priceRows[0]?.max ?? null,
      },
    },
  }
}

export async function findCategoryBySlug(slug: string): Promise<CategoryNode | null> {
  return prisma.category.findFirst({
    where: {
      slug,
      isActive: true,
    },
    select: {
      id: true,
      parentId: true,
    },
  })
}

export async function findCategoriesByParentIds(
  parentIds: string[],
): Promise<CategoryNode[]> {
  if (parentIds.length === 0) {
    return []
  }

  return prisma.category.findMany({
    where: {
      parentId: {
        in: parentIds,
      },
      isActive: true,
    },
    select: {
      id: true,
      parentId: true,
    },
  })
}

/**
 * Find one active product by ID, including all its variants.
 * Returns null if not found or not active.
 */
export async function findProductById(
  id: string
): Promise<ProductDetailProduct | null> {
  return prisma.product.findFirst({
    where: {
      id,
      isActive: true,
      status: 'PUBLISHED',
      store: {
        isActive: true,
      },
    },
    include: {
      variants: true,
      store: {
        select: {
          name: true,
          slug: true,
        },
      },
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
      images: {
        select: {
          id: true,
          url: true,
          altText: true,
          isPrimary: true,
          position: true,
          createdAt: true,
        },
        orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      },
      ratingSummary: {
        select: {
          productId: true,
          ratingAvg: true,
          ratingCount: true,
          rating1Count: true,
          rating2Count: true,
          rating3Count: true,
          rating4Count: true,
          rating5Count: true,
          updatedAt: true,
        },
      },
    },
  })
}
