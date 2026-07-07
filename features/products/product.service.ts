import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { Prisma, ProductBadgeType, ProductStatus } from '@/app/generated/prisma/client'
import type { Product, ProductVariant } from '@/app/generated/prisma/client'
import type {
  ProductDetailDto,
  ProductBadgeContext,
  ProductFeedPageDto,
  ProductImageDto,
  ProductMarketplaceBadgeDto,
  ProductListDto,
  ProductSearchAppliedFiltersDto,
  ProductSearchDto,
  ProductSearchFacetsDto,
  ProductSearchItemDto,
  ProductSearchSort,
  ProductStockStatus,
  ProductSummaryDto,
  ProductVariantDto,
  HomepageProductSectionsDto,
} from '@/features/products/product.dto'
import type { ReviewRatingSummaryDto } from '@/features/review/review.dto'
import {
  findCategoryBySlug,
  findProductCards,
  findProductCardsPage,
  findProductById,
  findProducts,
  searchProducts as repositorySearchProducts,
} from '@/features/products/product.repository'
import type { ProductDetailProduct, ProductListProduct, ProductSearchRepositoryResult } from '@/features/products/product.repository'
import type {
  ProductCategoryPaginationQuery,
  ProductListQuery,
  ProductPaginationQuery,
  ProductSearchQuery,
} from '@/features/products/product.schema'
import { InvalidFilterError, SearchExecutionError } from '@/lib/errors/product'
import { getActiveCategoryTraversalNodesCached } from '@/features/categories/category.cache'
import { getVisibleProductPromotions } from '@/features/promotions/promotions.service'
import { SEO_CACHE_TAGS } from '@/features/seo/seo.cache'
import { measureServerOperation } from '@/lib/observability/server-timing'
import { logInfo } from '@/utils/logger'
import {
  resolveMarketplaceBadgesForProducts,
} from './product-badge.service'
import type { ProductBadgeDto } from './product-badge.dto'

const LOW_STOCK_THRESHOLD = 3
const MAX_CATEGORY_SUBTREE_DEPTH = 128

type ProductSearchTraceContext = {
  requestId?: string
  route?: string
}

function isDefaultCatalogSearchQuery(
  query: ProductSearchQuery,
  sort: ProductSearchSort,
) {
  return (
    !query.q?.trim() &&
    !query.category &&
    query.minPrice === undefined &&
    query.maxPrice === undefined &&
    query.inStock === undefined &&
    query.rating === undefined &&
    query.badge === undefined &&
    !query.store?.trim() &&
    sort === 'newest'
  )
}

function deriveInventoryState(variants: Array<Pick<ProductVariant, 'stock'>>): {
  inStock: boolean
  totalStock: number
  stockStatus: ProductStockStatus
} {
  const totalStock = variants.reduce((sum, variant) => sum + Math.max(variant.stock, 0), 0)
  const inStock = variants.some((variant) => variant.stock > 0)

  if (!inStock || totalStock <= 0) {
    return {
      inStock: false,
      totalStock,
      stockStatus: 'OUT_OF_STOCK',
    }
  }

  if (totalStock <= LOW_STOCK_THRESHOLD) {
    return {
      inStock: true,
      totalStock,
      stockStatus: 'LOW_STOCK',
    }
  }

  return {
    inStock: true,
    totalStock,
    stockStatus: 'IN_STOCK',
  }
}

type ProductSummaryVariantLike = Pick<ProductVariant, 'id' | 'sku' | 'price' | 'stock'> & {
  size?: string | null
  color?: string | null
}

type ProductRatingSummaryLike = {
  ratingAvg: {
    toNumber(): number
  }
  ratingCount: number
  rating1Count: number
  rating2Count: number
  rating3Count: number
  rating4Count: number
  rating5Count: number
} | null

// ---------------------------------------------------------------------------
// Typed application errors
// ---------------------------------------------------------------------------

export class ProductNotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const

  constructor(id: string) {
    super(`Product with id "${id}" was not found`)
    this.name = 'ProductNotFoundError'
  }
}

// ---------------------------------------------------------------------------
// DTO mappers
// ---------------------------------------------------------------------------

/**
 * Map a Prisma Product row to ProductSummaryDto.
 * Decimal price is serialized to string to preserve precision in JSON.
 */
function toProductSummaryDto(
  product: Product | ProductListProduct,
  variants: ProductSummaryVariantLike[] = [],
  marketplaceBadges: ProductBadgeDto[] = [],
  badgeContext: ProductBadgeContext = 'DEFAULT',
  promotionSummary: ProductSummaryDto['promotionSummary'] = null,
): ProductSummaryDto {
  const allBadgeTypes = new Set(marketplaceBadges.map((badge) => badge.type))
  const contextualBadges = selectContextualBadges(marketplaceBadges, badgeContext)
  const inventoryState = deriveInventoryState(variants)

  return {
    id: product.id,
    storeId: product.storeId,
    name: product.name,
    description: product.description ?? null,
    price: product.price.toString(),
    imageUrl: resolveProductImageUrl(product),
    isActive: product.isActive,
    inStock: inventoryState.inStock,
    totalStock: inventoryState.totalStock,
    stockStatus: inventoryState.stockStatus,
    sku: product.sku ?? null,
    isHit: allBadgeTypes.has('HIT') || product.isHit,
    isNew: allBadgeTypes.has('NEW') || product.isNew,
    href: `/products/${product.id}`,
    badgeContext,
    badges: contextualBadges.map(toProductMarketplaceBadgeDto),
    ratingSummary: toRatingSummaryDto('ratingSummary' in product ? product.ratingSummary : null),
    promotionSummary,
    createdAt: product.createdAt.toISOString(),
    variants: variants.map(toProductVariantDto),
  }
}

function resolveProductImageUrl(product: Product | ProductListProduct): string | null {
  const primaryImage =
    'images' in product
      ? product.images.find((image) => image.isPrimary) ?? product.images[0]
      : null

  return primaryImage?.url ?? product.imageUrl ?? null
}

function toProductMarketplaceBadgeDto(badge: ProductBadgeDto): ProductMarketplaceBadgeDto {
  return {
    id: badge.id,
    type: badge.type,
    source: badge.source,
    score: badge.score,
    startsAt: badge.startsAt,
    endsAt: badge.endsAt,
  }
}

function toProductImageDto(product: ProductDetailProduct): ProductImageDto[] {
  return product.images.map((image) => ({
    id: image.id,
    url: image.url,
    altText: image.altText ?? null,
    isPrimary: image.isPrimary,
    position: image.position,
  }))
}

function toSearchProductItemDto(
  product: ProductListProduct,
  marketplaceBadges: ProductBadgeDto[] = [],
): ProductSearchItemDto {
  return {
    ...toProductSummaryDto(product, product.variants, marketplaceBadges, 'DEFAULT'),
    storeName: product.store.name,
    storeSlug: product.store.slug,
  }
}

function toRatingSummaryDto(ratingSummary: ProductRatingSummaryLike): ReviewRatingSummaryDto {
  if (!ratingSummary) {
    return {
      averageRating: 0,
      totalCount: 0,
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 0,
      rating4Count: 0,
      rating5Count: 0,
    }
  }

  return {
    averageRating: Number(ratingSummary.ratingAvg.toNumber().toFixed(2)),
    totalCount: ratingSummary.ratingCount,
    rating1Count: ratingSummary.rating1Count,
    rating2Count: ratingSummary.rating2Count,
    rating3Count: ratingSummary.rating3Count,
    rating4Count: ratingSummary.rating4Count,
    rating5Count: ratingSummary.rating5Count,
  }
}

const DEFAULT_BADGE_PRIORITY: ProductBadgeDto['type'][] = [
  ProductBadgeType.FEATURED,
  ProductBadgeType.HIT,
  ProductBadgeType.NEW,
]

function selectContextualBadges(
  marketplaceBadges: ProductBadgeDto[],
  badgeContext: ProductBadgeContext,
): ProductBadgeDto[] {
  if (badgeContext === 'DEFAULT') {
    for (const badgeType of DEFAULT_BADGE_PRIORITY) {
      const badge = marketplaceBadges.find((entry) => entry.type === badgeType)
      if (badge) {
        return [badge]
      }
    }

    return []
  }

  return marketplaceBadges.filter((badge) => badge.type === badgeContext)
}

/**
 * Map a Prisma ProductVariant row to ProductVariantDto.
 * Nullable Decimal price is serialized to string or null.
 */
function toProductVariantDto(variant: ProductSummaryVariantLike): ProductVariantDto {
  return {
    id: variant.id,
    sku: variant.sku,
    size: variant.size ?? null,
    color: variant.color ?? null,
    price: variant.price != null ? variant.price.toString() : null,
    stock: variant.stock,
  }
}

async function toProductListDtoWithMarketplaceFlags(
  items: Array<Product | ProductListProduct>,
  page: number,
  limit: number,
  total: number,
  badgeContext: ProductBadgeContext = 'DEFAULT',
): Promise<ProductListDto> {
  const mappedItems = await mapProductSummaryItems(items, badgeContext)
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit)

  return {
    badgeContext,
    items: mappedItems,
    total,
    page,
    totalPages,
    data: mappedItems,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page * limit < total,
    },
  }
}

async function mapProductSummaryItems(
  items: Array<Product | ProductListProduct>,
  badgeContext: ProductBadgeContext,
): Promise<ProductSummaryDto[]> {
  if (items.length === 0) {
    return []
  }

  const badgesByProductId = await resolveMarketplaceBadgesForProducts(
    items.map((item) => ({
      id: item.id,
      status: item.status,
      publishedAt: item.publishedAt,
      isActive: item.isActive,
    })),
  )
  const promotionsByProductId = await getVisibleProductPromotions({
    products: items.map((item) => ({
      id: item.id,
      storeId: item.storeId,
      categoryId: item.categoryId ?? null,
    })),
  })

  logInfo('products:map-summary-items:before-dto-mapping', {
    domain: 'products',
    itemCount: items.length,
    badgeContext,
  })
  const dtoItems = items.map((item) =>
    toProductSummaryDto(
      item,
      'variants' in item ? item.variants : [],
      badgesByProductId.get(item.id) ?? [],
      badgeContext,
      promotionsByProductId.get(item.id) ?? null,
    ),
  )
  logInfo('products:map-summary-items:after-dto-mapping', {
    domain: 'products',
    itemCount: dtoItems.length,
    badgeContext,
  })
  return dtoItems
}

function emptyProductListDto(
  page: number,
  limit: number,
  badgeContext: ProductBadgeContext = 'DEFAULT',
): ProductListDto {
  return {
    badgeContext,
    items: [],
    total: 0,
    page,
    totalPages: 0,
    data: [],
    meta: {
      page,
      limit,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
    },
  }
}

function buildCatalogWhereInput(params: {
  categoryIds?: string[]
  size?: string
  priceMin?: number
  priceMax?: number
  storeId?: string
  isNew?: boolean
  isHit?: boolean
}): Prisma.ProductWhereInput {
  const { categoryIds, size, priceMin, priceMax, storeId, isNew, isHit } = params
  const now = new Date()
  const newBadgeWindowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const andConditions: Prisma.ProductWhereInput[] = [
    {
      OR: [{ categoryId: null }, { category: { isActive: true } }],
    },
  ]

  const priceFilter: Prisma.DecimalFilter<'Product'> | undefined =
    priceMin !== undefined || priceMax !== undefined
      ? {
          ...(priceMin !== undefined ? { gte: priceMin } : {}),
          ...(priceMax !== undefined ? { lte: priceMax } : {}),
        }
      : undefined

  if (isNew !== undefined) {
    andConditions.push(
      isNew
        ? {
            publishedAt: {
              gte: newBadgeWindowStart,
            },
          }
        : {
            OR: [{ publishedAt: null }, { publishedAt: { lt: newBadgeWindowStart } }],
          },
    )
  }

  if (isHit !== undefined) {
    andConditions.push(
      isHit
        ? {
            badges: {
              some: {
                type: ProductBadgeType.HIT,
                OR: [{ startsAt: null }, { startsAt: { lte: now } }],
                AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
              },
            },
          }
        : {
            badges: {
              none: {
                type: ProductBadgeType.HIT,
                OR: [{ startsAt: null }, { startsAt: { lte: now } }],
                AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
              },
            },
          },
    )
  }

  return {
    isActive: true,
    status: ProductStatus.PUBLISHED,
    store: {
      isActive: true,
    },
    AND: andConditions,
    ...(storeId ? { storeId } : {}),
    ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
    ...(priceFilter ? { price: priceFilter } : {}),
    ...(size
      ? {
          variants: {
            some: {
              size,
            },
          },
        }
      : {}),
  }
}

function buildHomepageFallbackWhereInput(params?: { excludeIds?: string[] }): Prisma.ProductWhereInput {
  const excludeIds = params?.excludeIds?.filter(Boolean) ?? []

  return {
    isActive: true,
    status: ProductStatus.PUBLISHED,
    store: {
      isActive: true,
    },
    AND: [{ OR: [{ categoryId: null }, { category: { isActive: true } }] }],
    ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
  }
}

function mapSortToOrderBy(
  sort: 'price_asc' | 'price_desc' | 'newest',
): Prisma.ProductOrderByWithRelationInput[] {
  if (sort === 'price_asc') {
    return [{ price: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }]
  }

  if (sort === 'price_desc') {
    return [{ price: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
  }

  return [{ createdAt: 'desc' }, { id: 'desc' }]
}

function resolveSearchSort(query: ProductSearchQuery): ProductSearchSort {
  if (query.sort) {
    if (query.sort === 'relevance' && !query.q?.trim()) {
      return 'newest'
    }

    return query.sort
  }

  return query.q?.trim() ? 'relevance' : 'newest'
}

function buildAppliedSearchFilters(query: ProductSearchQuery): ProductSearchAppliedFiltersDto {
  return {
    q: query.q?.trim() || null,
    category: query.category ?? null,
    minPrice: query.minPrice ?? null,
    maxPrice: query.maxPrice ?? null,
    inStock: query.inStock ?? null,
    rating: query.rating ?? null,
    badge: query.badge ?? null,
    store: query.store ?? null,
  }
}

function toSearchFacetsDto(result: ProductSearchRepositoryResult): ProductSearchFacetsDto {
  return {
    categories: result.facets.categories,
    stores: result.facets.stores,
    availability: result.facets.availability,
    ratings: result.facets.ratings,
    badges: result.facets.badges,
    priceRange: {
      min: result.facets.priceRange.min?.toString() ?? null,
      max: result.facets.priceRange.max?.toString() ?? null,
    },
  }
}

async function resolveCategoryTreeIds(rootCategoryId: string): Promise<string[]> {
  logInfo('products:category-subtree:before-all-categories-fetch', {
    domain: 'products',
    rootCategoryId,
  })
  const categories = await getActiveCategoryTraversalNodesCached()
  logInfo('products:category-subtree:after-all-categories-fetch', {
    domain: 'products',
    rootCategoryId,
    categoryCount: categories.length,
  })

  const childrenByParentId = new Map<string, string[]>()
  for (const category of categories) {
    if (!category.parentId) {
      continue
    }

    const childIds = childrenByParentId.get(category.parentId) ?? []
    childIds.push(category.id)
    childrenByParentId.set(category.parentId, childIds)
  }

  const resolvedIds = new Set<string>([rootCategoryId])
  const orderedIds = [rootCategoryId]
  let frontier = [rootCategoryId]
  let depth = 0

  while (frontier.length > 0) {
    if (depth >= MAX_CATEGORY_SUBTREE_DEPTH) {
      logInfo('products:category-subtree:max-depth-reached', {
        domain: 'products',
        rootCategoryId,
        depth,
        frontierCount: frontier.length,
      })
      break
    }

    const nextFrontier: string[] = []

    for (const parentId of frontier) {
      const childIds = childrenByParentId.get(parentId) ?? []
      if (childIds.length === 0) {
        continue
      }

      for (const childId of childIds) {
        if (resolvedIds.has(childId)) {
          continue
        }

        resolvedIds.add(childId)
        orderedIds.push(childId)
        nextFrontier.push(childId)
      }
    }

    frontier = nextFrontier
    depth += 1
  }

  logInfo('products:category-subtree:descendant-ids-count', {
    domain: 'products',
    rootCategoryId,
    descendantIdsCount: orderedIds.length,
    depth,
  })

  return orderedIds
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function listProducts(
  query: ProductListQuery
): Promise<ProductListDto> {
  const {
    category,
    size,
    priceMin,
    priceMax,
    sort,
    page,
    limit,
    storeId,
  } = query

  let categoryIds: string[] | undefined

  if (category) {
    logInfo('products:category-subtree:before-root-lookup', {
      domain: 'products',
      slug: category,
    })
    const categoryNode = await findCategoryBySlug(category)
    logInfo('products:category-subtree:after-root-lookup', {
      domain: 'products',
      slug: category,
      found: Boolean(categoryNode),
      categoryId: categoryNode?.id ?? null,
    })

    if (!categoryNode) {
      return emptyProductListDto(page, limit)
    }

    categoryIds = await resolveCategoryTreeIds(categoryNode.id)
  }

  const where = buildCatalogWhereInput({
    categoryIds,
    size,
    priceMin,
    priceMax,
    storeId,
  })
  const orderBy = mapSortToOrderBy(sort)
  const { items, total } = await findProducts({ where, orderBy, page, limit })

  return toProductListDtoWithMarketplaceFlags(items, page, limit, total, 'DEFAULT')
}

export async function listNewProducts(
  query: ProductPaginationQuery,
): Promise<ProductListDto> {
  return measureServerOperation(
    'listNewProducts',
    {
      service: 'features/products/product.service',
      route: '/products/new',
      page: query.page,
      limit: query.limit,
    },
    async () => {
      const { page, limit } = query
      const where = buildCatalogWhereInput({ isNew: true })
      const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ]
      const { items, total } = await findProducts({ where, orderBy, page, limit })

      return toProductListDtoWithMarketplaceFlags(items, page, limit, total, 'NEW')
    },
  )
}

export async function listHitProducts(
  query: ProductPaginationQuery,
): Promise<ProductListDto> {
  return measureServerOperation(
    'listHitProducts',
    {
      service: 'features/products/product.service',
      route: '/products/hit',
      page: query.page,
      limit: query.limit,
    },
    async () => {
      const { page, limit } = query
      const where = buildCatalogWhereInput({ isHit: true })
      const orderBy = mapSortToOrderBy('newest')
      const { items, total } = await findProducts({ where, orderBy, page, limit })

      return toProductListDtoWithMarketplaceFlags(items, page, limit, total, 'HIT')
    },
  )
}

const getHomepageProductSectionsCached = unstable_cache(
  async (limit: number): Promise<HomepageProductSectionsDto> => {
    logInfo('homepage-sections:cache-callback:start', {
      domain: 'products',
      route: '/',
      limit,
    })
    const newWhere = buildCatalogWhereInput({ isNew: true })
    const hitWhere = buildCatalogWhereInput({ isHit: true })
    const fallbackOrderBy: Prisma.ProductOrderByWithRelationInput[] = [
      { publishedAt: 'desc' },
      { createdAt: 'desc' },
      { id: 'desc' },
    ]
    const newOrderBy: Prisma.ProductOrderByWithRelationInput[] = [
      { publishedAt: 'desc' },
      { createdAt: 'desc' },
      { id: 'desc' },
    ]
    const hitOrderBy = mapSortToOrderBy('newest')

    // Keep homepage reads bounded and sequential to avoid unnecessary pool pressure.
    logInfo('homepage-sections:before-strict-new-query', {
      domain: 'products',
      route: '/',
      limit,
    })
    const strictNewItems = await findProductCards({
      where: newWhere,
      orderBy: newOrderBy,
      limit,
    })
    logInfo('homepage-sections:after-strict-new-query', {
      domain: 'products',
      route: '/',
      count: strictNewItems.length,
    })
    const newItems =
      strictNewItems.length > 0
        ? strictNewItems
        : await findProductCards({
            where: buildHomepageFallbackWhereInput(),
            orderBy: fallbackOrderBy,
            limit,
          })

    logInfo('homepage-sections:before-strict-hit-query', {
      domain: 'products',
      route: '/',
      limit,
    })
    const strictHitItems = await findProductCards({
      where: hitWhere,
      orderBy: hitOrderBy,
      limit,
    })
    logInfo('homepage-sections:after-strict-hit-query', {
      domain: 'products',
      route: '/',
      count: strictHitItems.length,
    })
    const hitItems =
      strictHitItems.length > 0
        ? strictHitItems
        : await findProductCards({
            where: buildHomepageFallbackWhereInput({
              excludeIds: newItems.map((item) => item.id),
            }),
            orderBy: fallbackOrderBy,
            limit,
          })

    const badgeCandidates = new Map<string, Product | ProductListProduct>()
    for (const item of [...newItems, ...hitItems]) {
      badgeCandidates.set(item.id, item)
    }

    logInfo('homepage-sections:before-badge-resolution', {
      domain: 'products',
      route: '/',
      candidateCount: badgeCandidates.size,
    })
    const badgesByProductId = await resolveMarketplaceBadgesForProducts(
      [...badgeCandidates.values()].map((item) => ({
        id: item.id,
        status: item.status,
        publishedAt: item.publishedAt,
        isActive: item.isActive,
      })),
    )
    logInfo('homepage-sections:after-badge-resolution', {
      domain: 'products',
      route: '/',
      candidateCount: badgeCandidates.size,
    })
    logInfo('homepage-sections:before-promotion-resolution', {
      domain: 'products',
      route: '/',
      candidateCount: badgeCandidates.size,
    })
    const promotionsByProductId = await getVisibleProductPromotions({
      products: [...badgeCandidates.values()].map((item) => ({
        id: item.id,
        storeId: item.storeId,
        categoryId: item.categoryId ?? null,
      })),
    })
    logInfo('homepage-sections:after-promotion-resolution', {
      domain: 'products',
      route: '/',
      candidateCount: badgeCandidates.size,
    })

    const mapWithContext = (items: ProductListProduct[], badgeContext: ProductBadgeContext) =>
      items.map((item) =>
        toProductSummaryDto(
          item,
          item.variants,
          badgesByProductId.get(item.id) ?? [],
          badgeContext,
          promotionsByProductId.get(item.id) ?? null,
        ),
      )

    logInfo('homepage-sections:before-cache-return', {
      domain: 'products',
      route: '/',
      newCount: newItems.length,
      hitCount: hitItems.length,
    })
    return {
      newProducts: mapWithContext(newItems, 'NEW'),
      hitProducts: mapWithContext(hitItems, 'HIT'),
    }
  },
  ['homepage-product-sections'],
  {
    revalidate: 120,
    tags: [SEO_CACHE_TAGS.products, SEO_CACHE_TAGS.categories, SEO_CACHE_TAGS.stores],
  },
)

export const getHomepageProductSections = cache(async (limit = 4): Promise<HomepageProductSectionsDto> =>
  measureServerOperation(
    'getHomepageProductSections',
    {
      service: 'features/products/product.service',
      route: '/',
      cache: 'unstable_cache:homepage-product-sections',
      limit,
    },
    async () => {
      logInfo('homepage-sections:before-unstable-cache', {
        domain: 'products',
        route: '/',
        limit,
      })
      const sections = await getHomepageProductSectionsCached(limit)
      logInfo('homepage-sections:after-unstable-cache', {
        domain: 'products',
        route: '/',
        limit,
        newCount: sections.newProducts.length,
        hitCount: sections.hitProducts.length,
      })
      return sections
    },
  ),
)

const getDefaultCatalogSearchCached = unstable_cache(
  async (page: number, limit: number): Promise<ProductSearchDto> => {
    logInfo('catalog-search:default-cache-callback:start', {
      domain: 'products',
      route: '/catalog',
      page,
      limit,
      cache: 'unstable_cache:default-catalog-search',
    })
    const result = await executeSearchProductsQuery(
      {
        page,
        limit,
        sort: 'newest',
      },
      undefined,
    )
    logInfo('catalog-search:default-cache-callback:after', {
      domain: 'products',
      route: '/catalog',
      page,
      limit,
      total: result.pagination.total,
      itemsCount: result.items.length,
      cache: 'unstable_cache:default-catalog-search',
    })
    return result
  },
  ['default-catalog-search'],
  {
    revalidate: 120,
    tags: [SEO_CACHE_TAGS.products, SEO_CACHE_TAGS.categories, SEO_CACHE_TAGS.stores],
  },
)

async function getInitialProductFeedPage(
  kind: 'new' | 'hit',
  limit: number,
): Promise<ProductFeedPageDto> {
  const where = buildCatalogWhereInput(kind === 'new' ? { isNew: true } : { isHit: true })
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    kind === 'new'
      ? [
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ]
      : mapSortToOrderBy('newest')

  logInfo('product-feed-page:before-repository', {
    domain: 'products',
    route: kind === 'new' ? '/products/new' : '/products/hit',
    kind,
    limit,
  })
  const result = await findProductCardsPage({
    where,
    orderBy,
    page: 1,
    limit,
  })
  logInfo('product-feed-page:after-repository', {
    domain: 'products',
    route: kind === 'new' ? '/products/new' : '/products/hit',
    kind,
    itemCount: result.items.length,
    hasNextPage: result.hasNextPage,
  })

  const badgeContext: ProductBadgeContext = kind === 'new' ? 'NEW' : 'HIT'
  logInfo('product-feed-page:before-badge-resolution', {
    domain: 'products',
    route: kind === 'new' ? '/products/new' : '/products/hit',
    kind,
    itemCount: result.items.length,
  })
  const badgesByProductId = await resolveMarketplaceBadgesForProducts(
    result.items.map((item) => ({
      id: item.id,
      status: item.status,
      publishedAt: item.publishedAt,
      isActive: item.isActive,
    })),
  )
  logInfo('product-feed-page:after-badge-resolution', {
    domain: 'products',
    route: kind === 'new' ? '/products/new' : '/products/hit',
    kind,
  })
  logInfo('product-feed-page:before-promotion-resolution', {
    domain: 'products',
    route: kind === 'new' ? '/products/new' : '/products/hit',
    kind,
  })
  const promotionsByProductId = await getVisibleProductPromotions({
    products: result.items.map((item) => ({
      id: item.id,
      storeId: item.storeId,
      categoryId: item.categoryId ?? null,
    })),
  })

  logInfo('product-feed-page:after-promotion-resolution', {
    domain: 'products',
    route: kind === 'new' ? '/products/new' : '/products/hit',
    kind,
  })
  logInfo('product-feed-page:before-dto-mapping', {
    domain: 'products',
    route: kind === 'new' ? '/products/new' : '/products/hit',
    kind,
    itemCount: result.items.length,
  })
  const dto = {
    items: result.items.map((item) =>
      toProductSummaryDto(
        item,
        item.variants,
        badgesByProductId.get(item.id) ?? [],
        badgeContext,
        promotionsByProductId.get(item.id) ?? null,
      ),
    ),
    page: 1,
    hasNextPage: result.hasNextPage,
  }
  logInfo('product-feed-page:after-dto-mapping', {
    domain: 'products',
    route: kind === 'new' ? '/products/new' : '/products/hit',
    kind,
    itemCount: dto.items.length,
    hasNextPage: dto.hasNextPage,
  })
  return dto
}

export async function getInitialNewProductsPage(limit = 12): Promise<ProductFeedPageDto> {
  return measureServerOperation(
    'getInitialNewProductsPage',
    {
      service: 'features/products/product.service',
      route: '/products/new',
      limit,
    },
    () => getInitialProductFeedPage('new', limit),
  )
}

export async function getInitialHitProductsPage(limit = 12): Promise<ProductFeedPageDto> {
  return measureServerOperation(
    'getInitialHitProductsPage',
    {
      service: 'features/products/product.service',
      route: '/products/hit',
      limit,
    },
    () => getInitialProductFeedPage('hit', limit),
  )
}

export async function listProductsByCategorySlug(
  slug: string,
  query: ProductCategoryPaginationQuery,
): Promise<ProductListDto> {
  const { page, limit } = query
  logInfo('products:category-subtree:before-root-lookup', {
    domain: 'products',
    slug,
  })
  const categoryNode = await findCategoryBySlug(slug)
  logInfo('products:category-subtree:after-root-lookup', {
    domain: 'products',
    slug,
    found: Boolean(categoryNode),
    categoryId: categoryNode?.id ?? null,
  })

  if (!categoryNode) {
    return emptyProductListDto(page, limit)
  }

  const categoryIds = await resolveCategoryTreeIds(categoryNode.id)
  const where = buildCatalogWhereInput({ categoryIds })
  const orderBy = mapSortToOrderBy('newest')
  const { items, total } = await findProducts({ where, orderBy, page, limit })

  return toProductListDtoWithMarketplaceFlags(items, page, limit, total, 'DEFAULT')
}

/**
 * Search active products by full-text query, ranked by ts_rank.
 *
 * The `q` term is validated upstream by Zod before this runs.
 * Returns empty items (not an error) when nothing matches.
 */
async function executeSearchProductsQuery(
  query: ProductSearchQuery,
  traceContext?: ProductSearchTraceContext,
): Promise<ProductSearchDto> {
  const sort = resolveSearchSort(query)
  const appliedFilters = buildAppliedSearchFilters(query)

  let categoryIds: string[] | undefined
  if (query.category) {
    logInfo('products:category-subtree:before-root-lookup', {
      domain: 'products',
      slug: query.category,
    })
    const categoryNode = await findCategoryBySlug(query.category)
    logInfo('products:category-subtree:after-root-lookup', {
      domain: 'products',
      slug: query.category,
      found: Boolean(categoryNode),
      categoryId: categoryNode?.id ?? null,
    })

    if (!categoryNode) {
      throw new InvalidFilterError('Category filter is invalid')
    }

    categoryIds = await resolveCategoryTreeIds(categoryNode.id)
  }

  const store = query.store?.trim()
  const storeFilter = store
    ? /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(store)
      ? { id: store }
      : { slug: store }
    : undefined

  try {
    logInfo('catalog-search:service:before-repository', {
      domain: 'products',
      route: traceContext?.route ?? '/catalog',
      requestId: traceContext?.requestId,
      page: query.page,
      limit: query.limit,
      sort,
      q: query.q?.trim() || null,
      categoryIdsCount: categoryIds?.length ?? 0,
      storeId: storeFilter?.id ?? null,
      storeSlug: storeFilter?.slug ?? null,
    })
    const result = await repositorySearchProducts({
      q: query.q?.trim() || undefined,
      categoryIds,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      inStock: query.inStock,
      rating: query.rating,
      badge: query.badge,
      store: storeFilter,
      sort,
      page: query.page,
      limit: query.limit,
      requestId: traceContext?.requestId,
      route: traceContext?.route,
    })
    logInfo('catalog-search:service:after-repository', {
      domain: 'products',
      route: traceContext?.route ?? '/catalog',
      requestId: traceContext?.requestId,
      itemsCount: result.items.length,
      total: result.total,
    })

    const badgesByProductId = await resolveMarketplaceBadgesForProducts(
      result.items.map((item) => ({
        id: item.id,
        status: item.status,
        publishedAt: item.publishedAt,
        isActive: item.isActive,
      })),
    )
    const promotionsByProductId = await getVisibleProductPromotions({
      products: result.items.map((item) => ({
        id: item.id,
        storeId: item.storeId,
        categoryId: item.categoryId ?? null,
      })),
    })

    return {
      items: result.items.map((item) => ({
        ...toSearchProductItemDto(item, badgesByProductId.get(item.id) ?? []),
        promotionSummary: promotionsByProductId.get(item.id) ?? null,
      })),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.total === 0 ? 0 : Math.ceil(result.total / result.limit),
        hasNextPage: result.page * result.limit < result.total,
      },
      facets: toSearchFacetsDto(result),
      appliedFilters,
      sort,
    }
  } catch (error) {
    throw new SearchExecutionError(
      error instanceof Error ? error.message : 'Search query could not be executed',
    )
  }
}

export async function searchProducts(
  query: ProductSearchQuery,
  traceContext?: ProductSearchTraceContext,
): Promise<ProductSearchDto> {
  const sort = resolveSearchSort(query)

  if (isDefaultCatalogSearchQuery(query, sort)) {
    return measureServerOperation(
      'searchProductsDefaultCatalogCached',
      {
        service: 'features/products/product.service',
        route: traceContext?.route ?? '/catalog',
        requestId: traceContext?.requestId,
        cache: 'unstable_cache:default-catalog-search',
        page: query.page,
        limit: query.limit,
      },
      () => getDefaultCatalogSearchCached(query.page, query.limit),
    )
  }

  return executeSearchProductsQuery(query, traceContext)
}

/**
 * Get a single active product by ID, including its variants.
 *
 * Throws ProductNotFoundError (code: 'NOT_FOUND') when the product does not
 * exist or is not active. API routes catch this and respond with 404.
 */
export async function getProduct(id: string): Promise<ProductDetailDto> {
  const product = await findProductById(id)

  if (!product) {
    throw new ProductNotFoundError(id)
  }

  const badgesByProductId = await resolveMarketplaceBadgesForProducts([{
    id: product.id,
    status: product.status,
    publishedAt: product.publishedAt,
    isActive: product.isActive,
  }])
  const promotionsByProductId = await getVisibleProductPromotions({
    products: [
      {
        id: product.id,
        storeId: product.storeId,
        categoryId: product.categoryId ?? null,
      },
    ],
  })

  return {
    ...toProductSummaryDto(
      product,
      product.variants,
      badgesByProductId.get(product.id) ?? [],
      'DEFAULT',
      promotionsByProductId.get(product.id) ?? null,
    ),
    images: toProductImageDto(product),
    storeName: product.store.name,
    storeSlug: product.store.slug,
    categoryName: product.category?.name ?? null,
    categorySlug: product.category?.slug ?? null,
    ratingSummary: toRatingSummaryDto(product.ratingSummary),
    variants: product.variants.map(toProductVariantDto),
  }
}
