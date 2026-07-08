import { prisma } from '@/lib/prisma'
import type { Category, Product, ProductBadgeType, ProductImage, ProductVariant, Store } from '@/app/generated/prisma/client'
import { Prisma } from '@/app/generated/prisma/client'
import { measureServerOperation } from '@/lib/observability/server-timing'
import { logError, logInfo } from '@/utils/logger'

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
      updatedAt: true
    }
  }>,
  | 'productId'
  | 'ratingAvg'
  | 'ratingCount'
  | 'updatedAt'
>
type ProductListStorePreview = Pick<Store, 'id' | 'name' | 'slug'>
type ProductListVariantPreview = Pick<ProductVariant, 'id' | 'sku' | 'price' | 'stock'>
type ProductListBaseRecord = Pick<
  Product,
  | 'id'
  | 'storeId'
  | 'categoryId'
  | 'name'
  | 'description'
  | 'price'
  | 'imageUrl'
  | 'isActive'
  | 'sku'
  | 'isHit'
  | 'isNew'
  | 'status'
  | 'publishedAt'
  | 'createdAt'
  | 'updatedAt'
>

export type ProductWithVariants = Product & { variants: ProductVariant[]; images: ProductImagePreview[] }
export type CategoryNode = Pick<Category, 'id' | 'parentId'>
const PRODUCT_DETAIL_SELECT = {
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
      size: true,
      color: true,
      price: true,
      stock: true,
    },
  },
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
} satisfies Prisma.ProductSelect

export type ProductDetailProduct = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_DETAIL_SELECT
}>

const PRODUCT_CARD_BASE_SELECT = {
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
} satisfies Prisma.ProductSelect

const PRODUCT_LIST_SELECT = PRODUCT_CARD_BASE_SELECT

type ProductCardBaseProduct = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_CARD_BASE_SELECT
}>

export type ProductListProduct = ProductListBaseRecord & {
  variants: ProductListVariantPreview[]
  images: ProductImagePreview[]
  store: ProductListStorePreview
  ratingSummary: ProductRatingSummaryPreview | null
}

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

interface FindProductCardsPageParams extends FindProductCardsParams {
  page: number
}

interface FindProductCardsPageResult {
  items: ProductListProduct[]
  hasNextPage: boolean
}

function mapById<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]))
}

type ProductCardRelationsRow = {
  productId: string
  storeId: string | null
  storeName: string | null
  storeSlug: string | null
  ratingAvg: Prisma.Decimal | null
  ratingCount: number | bigint | null
  ratingUpdatedAt: Date | null
  imageId: string | null
  imageUrl: string | null
  imageIsPrimary: boolean | null
  imagePosition: number | null
  imageCreatedAt: Date | null
}

type ProductCardRelationsResult = {
  storesById: Map<string, ProductListStorePreview>
  ratingsByProductId: Map<string, ProductRatingSummaryPreview>
  imagesByProductId: Map<string, ProductImagePreview[]>
}

function toCount(value: number | bigint | null | undefined) {
  if (typeof value === 'bigint') {
    return Number(value)
  }

  return value ?? 0
}

async function loadProductCardRelations(
  productIds: string[],
): Promise<ProductCardRelationsResult> {
  if (productIds.length === 0) {
    return {
      storesById: new Map(),
      ratingsByProductId: new Map(),
      imagesByProductId: new Map(),
    }
  }

  const rows = await prisma.$queryRaw<ProductCardRelationsRow[]>(Prisma.sql`
    SELECT
      p."id" AS "productId",
      s."id" AS "storeId",
      s."name" AS "storeName",
      s."slug" AS "storeSlug",
      prs."rating_avg" AS "ratingAvg",
      prs."rating_count" AS "ratingCount",
      prs."updated_at" AS "ratingUpdatedAt",
      pi."id" AS "imageId",
      pi."url" AS "imageUrl",
      pi."is_primary" AS "imageIsPrimary",
      pi."position" AS "imagePosition",
      pi."created_at" AS "imageCreatedAt"
    FROM "public"."products" p
    INNER JOIN "public"."stores" s
      ON s."id" = p."store_id"
    LEFT JOIN "public"."product_rating_summaries" prs
      ON prs."product_id" = p."id"
    LEFT JOIN LATERAL (
      SELECT
        img."id",
        img."url",
        img."is_primary",
        img."position",
        img."created_at"
      FROM "public"."product_images" img
      WHERE img."product_id" = p."id"
        AND img."is_primary" = true
      ORDER BY img."position" ASC, img."created_at" ASC, img."id" ASC
      LIMIT 1
    ) pi ON true
    WHERE p."id" IN (${Prisma.join(productIds)})
  `)

  const storesById = new Map<string, ProductListStorePreview>()
  const ratingsByProductId = new Map<string, ProductRatingSummaryPreview>()
  const imagesByProductId = new Map<string, ProductImagePreview[]>()

  for (const row of rows) {
    if (row.storeId && !storesById.has(row.storeId)) {
      storesById.set(row.storeId, {
        id: row.storeId,
        name: row.storeName ?? '',
        slug: row.storeSlug ?? '',
      })
    }

    if (row.ratingAvg != null && !ratingsByProductId.has(row.productId)) {
      ratingsByProductId.set(row.productId, {
        productId: row.productId,
        ratingAvg: row.ratingAvg,
        ratingCount: toCount(row.ratingCount),
        updatedAt: row.ratingUpdatedAt ?? new Date(0),
      })
    }

    if (row.imageId && row.imageUrl && !imagesByProductId.has(row.productId)) {
      imagesByProductId.set(row.productId, [
        {
          id: row.imageId,
          url: row.imageUrl,
          isPrimary: row.imageIsPrimary ?? true,
          position: row.imagePosition ?? 0,
          createdAt: row.imageCreatedAt ?? new Date(0),
        },
      ])
    }
  }

  return {
    storesById,
    ratingsByProductId,
    imagesByProductId,
  }
}

async function loadProductCardVariants(
  productIds: string[],
): Promise<Map<string, ProductListVariantPreview[]>> {
  if (productIds.length === 0) {
    return new Map()
  }

  const variants = await prisma.productVariant.findMany({
    where: {
      productId: {
        in: productIds,
      },
    },
    select: {
      id: true,
      productId: true,
      sku: true,
      price: true,
      stock: true,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })

  const grouped = new Map<string, ProductListVariantPreview[]>()
  for (const variant of variants) {
    const existing = grouped.get(variant.productId) ?? []
    existing.push({
      id: variant.id,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
    })
    grouped.set(variant.productId, existing)
  }

  return grouped
}

async function loadProductCardPrimaryImages(
  productIds: string[],
): Promise<Map<string, ProductImagePreview[]>> {
  if (productIds.length === 0) {
    return new Map()
  }

  const images = await prisma.productImage.findMany({
    where: {
      productId: {
        in: productIds,
      },
      isPrimary: true,
    },
    select: {
      id: true,
      productId: true,
      url: true,
      isPrimary: true,
      position: true,
      createdAt: true,
    },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })

  const grouped = new Map<string, ProductImagePreview[]>()
  for (const image of images) {
    if (grouped.has(image.productId)) {
      continue
    }

    grouped.set(image.productId, [
      {
        id: image.id,
        url: image.url,
        isPrimary: image.isPrimary,
        position: image.position,
        createdAt: image.createdAt,
      },
    ])
  }

  return grouped
}

async function hydrateProductCardRecords(
  products: ProductCardBaseProduct[],
): Promise<ProductListProduct[]> {
  if (products.length === 0) {
    return []
  }

  const productIds = products.map((product) => product.id)

  const [{ storesById, ratingsByProductId, imagesByProductId }, variantsByProductId] = await Promise.all([
    loadProductCardRelations(productIds),
    loadProductCardVariants(productIds),
  ])

  return products.map((product) => ({
    ...product,
    store: storesById.get(product.storeId) ?? {
      id: product.storeId,
      name: '',
      slug: '',
    },
    ratingSummary: ratingsByProductId.get(product.id) ?? null,
    variants: variantsByProductId.get(product.id) ?? [],
    images: imagesByProductId.get(product.id) ?? [],
  }))
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
  requestId?: string
  route?: string
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

  const [items, total] = await measureServerOperation(
    'findProducts',
    {
      repository: 'features/products/product.repository',
      sql: 'prisma.product.findMany + prisma.product.count',
      page,
      limit,
    },
    () =>
      Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          select: PRODUCT_CARD_BASE_SELECT,
        }),
        prisma.product.count({ where }),
      ]),
  )

  return { items: await hydrateProductCardRecords(items), total }
}

export async function findProductCards(
  params: FindProductCardsParams
): Promise<ProductListProduct[]> {
  const { where, orderBy, limit } = params

  const products = await measureServerOperation(
    'findProductCards',
    {
      repository: 'features/products/product.repository',
      sql: 'prisma.product.findMany(card base select)',
      limit,
    },
    () =>
      prisma.product.findMany({
        where,
        take: limit,
        orderBy,
        select: PRODUCT_CARD_BASE_SELECT,
      }),
  )

  return hydrateProductCardRecords(products)
}

export async function findProductCardsPage(
  params: FindProductCardsPageParams,
): Promise<FindProductCardsPageResult> {
  const { where, orderBy, limit, page } = params
  const skip = (page - 1) * limit

  const rows = await measureServerOperation(
    'findProductCardsPage',
    {
      repository: 'features/products/product.repository',
      sql: 'prisma.product.findMany(card base select, limit + 1)',
      page,
      limit,
    },
    () =>
      prisma.product.findMany({
        where,
        skip,
        take: limit + 1,
        orderBy,
        select: PRODUCT_CARD_BASE_SELECT,
      }),
  )

  const items = await hydrateProductCardRecords(rows.slice(0, limit))

  return {
    items,
    hasNextPage: rows.length > limit,
  }
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
    select: PRODUCT_CARD_BASE_SELECT,
  })

  const hydratedItems = await hydrateProductCardRecords(items)
  const itemsById = new Map(hydratedItems.map((item) => [item.id, item]))
  return ids.map((id) => itemsById.get(id)).filter((item): item is ProductListProduct => Boolean(item))
}

type CountRow = { count: bigint }
type ProductIdRow = { id: string }
type CategoryFacetRow = { id: string; slug: string; name: string; count: bigint }
type StoreFacetRow = { id: string; slug: string; name: string; count: bigint }
type AvailabilityFacetRow = { inStock: bigint; outOfStock: bigint }
type SearchSummaryRow = {
  total: bigint
  inStock: bigint
  outOfStock: bigint
  min: Prisma.Decimal | null
  max: Prisma.Decimal | null
  rating5: bigint
  rating4: bigint
  rating3: bigint
  rating2: bigint
  rating1: bigint
}
type BadgeFacetRow = { type: ProductBadgeType; count: bigint }

function logCatalogSearchQuery(label: string, query: Prisma.Sql, params: ProductSearchRepositoryParams) {
  logInfo(`catalog-search:${label}`, {
    domain: 'products',
    route: params.route ?? '/catalog',
    requestId: params.requestId,
    page: params.page,
    limit: params.limit,
    sort: params.sort,
    q: params.q ?? null,
    categoryIdsCount: params.categoryIds?.length ?? 0,
    inStock: params.inStock ?? null,
    rating: params.rating ?? null,
    badge: params.badge ?? null,
    storeId: params.store?.id ?? null,
    storeSlug: params.store?.slug ?? null,
    sql: query.text,
    values: query.values,
  })
}

async function executeCatalogSearchQuery<T>(
  label: string,
  query: Prisma.Sql,
  params: ProductSearchRepositoryParams,
): Promise<T> {
  logInfo(`catalog-search:${label}:before-queryRaw`, {
    domain: 'products',
    route: params.route ?? '/catalog',
    requestId: params.requestId,
  })
  logCatalogSearchQuery(`${label}:compiled`, query, params)

  try {
    const result = await prisma.$queryRaw<T>(query)
    logInfo(`catalog-search:${label}:after-queryRaw`, {
      domain: 'products',
      route: params.route ?? '/catalog',
      requestId: params.requestId,
    })
    return result
  } catch (error) {
    logError(`catalog-search:${label}:queryRaw-error`, error, {
      domain: 'products',
      route: params.route ?? '/catalog',
      requestId: params.requestId,
    })
    throw error
  } finally {
    logInfo(`catalog-search:${label}:finally`, {
      domain: 'products',
      route: params.route ?? '/catalog',
      requestId: params.requestId,
    })
  }
}

type FilteredProductsCteOptions = {
  includeCardFields?: boolean
  includeCreatedAt?: boolean
  includeCategoryId?: boolean
  includeStoreId?: boolean
  includePrice?: boolean
  includeRating?: boolean
  includeMetrics?: boolean
  includeInStock?: boolean
  includeRank?: boolean
}

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

function buildSearchOrderBySql(
  params: ProductSearchRepositoryParams,
  alias: 'fp' | 'ap' | 'pp' = 'fp',
): Prisma.Sql {
  const column = (name: string) => `"${alias}"."${name}"`

  if (params.sort === 'price_asc') {
    return Prisma.sql`${Prisma.raw(`${column('price')} ASC, ${column('created_at')} DESC, ${column('id')} DESC`)}`
  }

  if (params.sort === 'price_desc') {
    return Prisma.sql`${Prisma.raw(`${column('price')} DESC, ${column('created_at')} DESC, ${column('id')} DESC`)}`
  }

  if (params.sort === 'rating') {
    return Prisma.sql`${Prisma.raw(`${column('rating_avg')} DESC, ${column('rating_count')} DESC, ${column('created_at')} DESC, ${column('id')} DESC`)}`
  }

  if (params.sort === 'popular') {
    return Prisma.sql`${Prisma.raw(`${column('hit_score')} DESC, ${column('sold_count')} DESC, ${column('wishlist_count')} DESC, ${column('view_count')} DESC, ${column('created_at')} DESC, ${column('id')} DESC`)}`
  }

  if (params.sort === 'relevance' && params.q?.trim()) {
    return Prisma.sql`${Prisma.raw(`${column('rank')} DESC NULLS LAST, ${column('created_at')} DESC, ${column('id')} DESC`)}`
  }

  return Prisma.sql`${Prisma.raw(`${column('created_at')} DESC, ${column('id')} DESC`)}`
}

function buildFilteredProductsCte(
  params: ProductSearchRepositoryParams,
  options: FilteredProductsCteOptions,
): Prisma.Sql {
  const query = params.q?.trim()
  const whereSql = buildPublicSearchWhereSql(params)
  const needsRatingJoin = options.includeRating || params.rating !== undefined
  const selectColumns: Prisma.Sql[] = [Prisma.sql`p."id"`]

  if (options.includeCardFields) {
    selectColumns.push(
      Prisma.sql`p."store_id"`,
      Prisma.sql`p."category_id"`,
      Prisma.sql`p."name"`,
      Prisma.sql`p."description"`,
      Prisma.sql`p."price"`,
      Prisma.sql`p."image_url"`,
      Prisma.sql`p."is_active"`,
      Prisma.sql`p."sku"`,
      Prisma.sql`p."is_hit"`,
      Prisma.sql`p."is_new"`,
      Prisma.sql`p."status"`,
      Prisma.sql`p."published_at"`,
      Prisma.sql`p."created_at"`,
      Prisma.sql`p."updated_at"`,
    )
  }

  if (options.includeCategoryId) {
    selectColumns.push(Prisma.sql`p."category_id"`)
  }

  if (options.includeStoreId) {
    selectColumns.push(Prisma.sql`p."store_id"`)
  }

  if (options.includePrice) {
    selectColumns.push(Prisma.sql`p."price"`)
  }

  if (options.includeCreatedAt) {
    selectColumns.push(Prisma.sql`p."created_at"`)
  }

  if (options.includeRating) {
    selectColumns.push(Prisma.sql`COALESCE(prs."rating_avg", 0) AS "rating_avg"`)
    selectColumns.push(Prisma.sql`COALESCE(prs."rating_count", 0) AS "rating_count"`)
  }

  if (options.includeMetrics) {
    selectColumns.push(Prisma.sql`COALESCE(pm."hit_score", 0) AS "hit_score"`)
    selectColumns.push(Prisma.sql`COALESCE(pm."sold_count", 0) AS "sold_count"`)
    selectColumns.push(Prisma.sql`COALESCE(pm."wishlist_count", 0) AS "wishlist_count"`)
    selectColumns.push(Prisma.sql`COALESCE(pm."view_count", 0) AS "view_count"`)
  }

  if (options.includeInStock) {
    selectColumns.push(Prisma.sql`
      EXISTS (
        SELECT 1
        FROM "public"."product_variants" pv
        WHERE pv."product_id" = p."id"
          AND pv."stock" > 0
      ) AS "in_stock"
    `)
  }

  if (options.includeRank) {
    selectColumns.push(
      query
        ? Prisma.sql`ts_rank(p."search_vector", plainto_tsquery('english', ${query})) AS "rank"`
        : Prisma.sql`NULL::real AS "rank"`,
    )
  }

  return Prisma.sql`
    WITH filtered_products AS (
      SELECT
        ${Prisma.join(selectColumns, ', ')}
      FROM "public"."products" p
      INNER JOIN "public"."stores" s ON s."id" = p."store_id"
      LEFT JOIN "public"."categories" c ON c."id" = p."category_id"
      ${needsRatingJoin ? Prisma.sql`LEFT JOIN "public"."product_rating_summaries" prs ON prs."product_id" = p."id"` : Prisma.empty}
      ${options.includeMetrics ? Prisma.sql`LEFT JOIN "public"."product_metrics" pm ON pm."product_id" = p."id"` : Prisma.empty}
      WHERE ${whereSql}
    )
  `
}

/**
 * Public search with FTS, filters, facets, and sort options.
 */
export async function searchProducts(
  params: ProductSearchRepositoryParams
): Promise<ProductSearchRepositoryResult> {
  logInfo('catalog-search:repository:before', {
    domain: 'products',
    route: params.route ?? '/catalog',
    requestId: params.requestId,
    page: params.page,
    limit: params.limit,
    sort: params.sort,
    q: params.q ?? null,
  })
  const skip = (params.page - 1) * params.limit
  const itemIdsCte = buildFilteredProductsCte(params, {
    includeCreatedAt: true,
    includePrice: params.sort === 'price_asc' || params.sort === 'price_desc',
    includeRating: params.sort === 'rating',
    includeMetrics: params.sort === 'popular',
    includeRank: params.sort === 'relevance' && Boolean(params.q?.trim()),
  })
  const summaryCte = buildFilteredProductsCte(params, {
    includeCategoryId: true,
    includeStoreId: true,
    includePrice: true,
    includeRating: true,
    includeInStock: true,
  })
  const badgeCte = buildFilteredProductsCte(params, {})
  const orderBySql = buildSearchOrderBySql(params)
  const itemIdsQuery = Prisma.sql`
    ${itemIdsCte}
    SELECT fp."id"
    FROM filtered_products fp
    ORDER BY ${orderBySql}
    LIMIT ${params.limit} OFFSET ${skip}
  `
  const summaryQuery = Prisma.sql`
    ${summaryCte}
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE fp."in_stock" = true) AS "inStock",
      COUNT(*) FILTER (WHERE fp."in_stock" = false) AS "outOfStock",
      MIN(fp."price") AS min,
      MAX(fp."price") AS max,
      COUNT(*) FILTER (WHERE fp."rating_avg" >= 5) AS rating5,
      COUNT(*) FILTER (WHERE fp."rating_avg" >= 4) AS rating4,
      COUNT(*) FILTER (WHERE fp."rating_avg" >= 3) AS rating3,
      COUNT(*) FILTER (WHERE fp."rating_avg" >= 2) AS rating2,
      COUNT(*) FILTER (WHERE fp."rating_avg" >= 1) AS rating1
    FROM filtered_products fp
  `
  const categoryFacetsQuery = Prisma.sql`
    ${summaryCte}
    SELECT
      c."id",
      c."slug",
      c."name",
      COUNT(*) AS count
    FROM filtered_products fp
    INNER JOIN "public"."categories" c ON c."id" = fp."category_id"
    GROUP BY c."id", c."slug", c."name"
    ORDER BY COUNT(*) DESC, c."name" ASC
  `
  const storeFacetsQuery = Prisma.sql`
    ${summaryCte}
    SELECT
      s."id",
      s."slug",
      s."name",
      COUNT(*) AS count
    FROM filtered_products fp
    INNER JOIN "public"."stores" s ON s."id" = fp."store_id"
    GROUP BY s."id", s."slug", s."name"
    ORDER BY COUNT(*) DESC, s."name" ASC
  `
  const badgeFacetsQuery = Prisma.sql`
    ${badgeCte}
    SELECT
      pb."type",
      COUNT(DISTINCT pb."product_id") AS count
    FROM filtered_products fp
    INNER JOIN "public"."product_badges" pb ON pb."product_id" = fp."id"
    WHERE (pb."starts_at" IS NULL OR pb."starts_at" <= CURRENT_TIMESTAMP)
      AND (pb."ends_at" IS NULL OR pb."ends_at" > CURRENT_TIMESTAMP)
    GROUP BY pb."type"
    ORDER BY COUNT(DISTINCT pb."product_id") DESC, pb."type" ASC
  `

  try {
    const itemIdRows = await executeCatalogSearchQuery<ProductIdRow[]>(
      'item-ids',
      itemIdsQuery,
      params,
    )
    const summaryRows = await executeCatalogSearchQuery<SearchSummaryRow[]>(
      'summary',
      summaryQuery,
      params,
    )
    const summaryRow = summaryRows[0]
    const total = Number(summaryRow?.total ?? BigInt(0))
    const ids = itemIdRows.map((row) => row.id)
    const items = await findProductsByIdsInOrder(ids)

    if (total === 0) {
      logInfo('catalog-search:repository:after', {
        domain: 'products',
        route: params.route ?? '/catalog',
        requestId: params.requestId,
        total,
        itemsCount: items.length,
        categoryFacetCount: 0,
        storeFacetCount: 0,
        badgeFacetCount: 0,
      })

      return {
        items,
        total,
        page: params.page,
        limit: params.limit,
        facets: {
          categories: [],
          stores: [],
          availability: {
            inStock: Number(summaryRow?.inStock ?? BigInt(0)),
            outOfStock: Number(summaryRow?.outOfStock ?? BigInt(0)),
          },
          ratings: [
            { minRating: 5, count: Number(summaryRow?.rating5 ?? BigInt(0)) },
            { minRating: 4, count: Number(summaryRow?.rating4 ?? BigInt(0)) },
            { minRating: 3, count: Number(summaryRow?.rating3 ?? BigInt(0)) },
            { minRating: 2, count: Number(summaryRow?.rating2 ?? BigInt(0)) },
            { minRating: 1, count: Number(summaryRow?.rating1 ?? BigInt(0)) },
          ],
          badges: [],
          priceRange: {
            min: summaryRow?.min ?? null,
            max: summaryRow?.max ?? null,
          },
        },
      }
    }

    const categoryRows = await executeCatalogSearchQuery<CategoryFacetRow[]>(
      'category-facets',
      categoryFacetsQuery,
      params,
    )
    const storeRows = await executeCatalogSearchQuery<StoreFacetRow[]>(
      'store-facets',
      storeFacetsQuery,
      params,
    )
    const badgeRows = await executeCatalogSearchQuery<BadgeFacetRow[]>(
      'badge-facets',
      badgeFacetsQuery,
      params,
    )

    logInfo('catalog-search:repository:after', {
      domain: 'products',
      route: params.route ?? '/catalog',
      requestId: params.requestId,
      total,
      itemsCount: items.length,
      categoryFacetCount: categoryRows.length,
      storeFacetCount: storeRows.length,
      badgeFacetCount: badgeRows.length,
    })

    return {
      items,
      total,
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
          inStock: Number(summaryRow?.inStock ?? BigInt(0)),
          outOfStock: Number(summaryRow?.outOfStock ?? BigInt(0)),
        },
        ratings: [
          { minRating: 5, count: Number(summaryRow?.rating5 ?? BigInt(0)) },
          { minRating: 4, count: Number(summaryRow?.rating4 ?? BigInt(0)) },
          { minRating: 3, count: Number(summaryRow?.rating3 ?? BigInt(0)) },
          { minRating: 2, count: Number(summaryRow?.rating2 ?? BigInt(0)) },
          { minRating: 1, count: Number(summaryRow?.rating1 ?? BigInt(0)) },
        ],
        badges: badgeRows.map((row) => ({
          type: row.type,
          count: Number(row.count),
        })),
        priceRange: {
          min: summaryRow?.min ?? null,
          max: summaryRow?.max ?? null,
        },
      },
    }
  } catch (error) {
    logError('catalog-search:repository:error', error, {
      domain: 'products',
      route: params.route ?? '/catalog',
      requestId: params.requestId,
      page: params.page,
      limit: params.limit,
      sort: params.sort,
    })
    throw error
  } finally {
    logInfo('catalog-search:repository:finally', {
      domain: 'products',
      route: params.route ?? '/catalog',
      requestId: params.requestId,
    })
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

/**
 * Find one active product by ID, including all its variants.
 * Returns null if not found or not active.
 */
export async function findProductById(
  id: string
): Promise<ProductDetailProduct | null> {
  return measureServerOperation(
    'findProductById',
    {
      repository: 'features/products/product.repository',
      sql: 'prisma.product.findFirst(detail include)',
      productId: id,
    },
    () =>
      prisma.product.findFirst({
        where: {
          id,
          isActive: true,
          status: 'PUBLISHED',
          store: {
            isActive: true,
          },
        },
        select: PRODUCT_DETAIL_SELECT,
      }),
  )
}
