import { Prisma, ProductBadgeType, ProductStatus } from '@/app/generated/prisma/client'
import type { Product, ProductVariant } from '@/app/generated/prisma/client'
import type {
  ProductDetailDto,
  ProductBadgeContext,
  ProductImageDto,
  ProductMarketplaceBadgeDto,
  ProductListDto,
  ProductStockStatus,
  ProductSummaryDto,
  ProductVariantDto,
} from '@/features/products/product.dto'
import type { ReviewRatingSummaryDto } from '@/features/review/review.dto'
import {
  findCategoriesByParentIds,
  findCategoryBySlug,
  findProductById,
  findProducts,
  searchProducts as repositorySearchProducts,
} from '@/features/products/product.repository'
import type {
  CategoryNode,
  ProductDetailProduct,
  ProductListProduct,
} from '@/features/products/product.repository'
import type {
  ProductCategoryPaginationQuery,
  ProductListQuery,
  ProductPaginationQuery,
  ProductSearchQuery,
} from '@/features/products/product.schema'
import {
  recalculateProductMetricsAndBadges,
  resolveMarketplaceBadgesForProducts,
} from './product-badge.service'
import type { ProductBadgeDto } from './product-badge.dto'

const LOW_STOCK_THRESHOLD = 3

function deriveInventoryState(variants: ProductVariant[]): {
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
  variants: ProductVariant[] = [],
  marketplaceBadges: ProductBadgeDto[] = [],
  badgeContext: ProductBadgeContext = 'DEFAULT',
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
    badgeContext,
    badges: contextualBadges.map(toProductMarketplaceBadgeDto),
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

function toProductRatingSummaryDto(product: ProductDetailProduct): ReviewRatingSummaryDto {
  if (!product.ratingSummary) {
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
    averageRating: Number(product.ratingSummary.ratingAvg.toNumber().toFixed(2)),
    totalCount: product.ratingSummary.ratingCount,
    rating1Count: product.ratingSummary.rating1Count,
    rating2Count: product.ratingSummary.rating2Count,
    rating3Count: product.ratingSummary.rating3Count,
    rating4Count: product.ratingSummary.rating4Count,
    rating5Count: product.ratingSummary.rating5Count,
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
function toProductVariantDto(variant: ProductVariant): ProductVariantDto {
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
  const badgesByProductId = await resolveMarketplaceBadgesForProducts(
    items.map((item) => ({
      id: item.id,
      status: item.status,
      publishedAt: item.publishedAt,
      isActive: item.isActive,
    })),
  )

  const mappedItems = items.map((item) =>
    toProductSummaryDto(
      item,
      'variants' in item ? item.variants : [],
      badgesByProductId.get(item.id) ?? [],
      badgeContext,
    ),
  )
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

  const priceFilter: Prisma.DecimalFilter<'Product'> | undefined =
    priceMin !== undefined || priceMax !== undefined
      ? {
          ...(priceMin !== undefined ? { gte: priceMin } : {}),
          ...(priceMax !== undefined ? { lte: priceMax } : {}),
        }
      : undefined

  return {
    isActive: true,
    status: ProductStatus.PUBLISHED,
    store: {
      isActive: true,
    },
    ...(storeId ? { storeId } : {}),
    ...(isNew !== undefined
      ? isNew
        ? { publishedAt: { gte: newBadgeWindowStart } }
        : {
            OR: [{ publishedAt: null }, { publishedAt: { lt: newBadgeWindowStart } }],
          }
      : {}),
    ...(isHit !== undefined
      ? isHit
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
          }
      : {}),
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

async function resolveCategoryTreeIds(rootCategoryId: string): Promise<string[]> {
  const resolvedIds = new Set<string>([rootCategoryId])
  let frontier = [rootCategoryId]

  while (frontier.length > 0) {
    const children: CategoryNode[] = await findCategoriesByParentIds(frontier)
    frontier = []

    for (const child of children) {
      if (resolvedIds.has(child.id)) {
        continue
      }

      resolvedIds.add(child.id)
      frontier.push(child.id)
    }
  }

  return [...resolvedIds]
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
    const categoryNode = await findCategoryBySlug(category)

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
  const { page, limit } = query
  const where = buildCatalogWhereInput({ isNew: true })
  const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
    { publishedAt: 'desc' },
    { createdAt: 'desc' },
    { id: 'desc' },
  ]
  const { items, total } = await findProducts({ where, orderBy, page, limit })

  return toProductListDtoWithMarketplaceFlags(items, page, limit, total, 'NEW')
}

export async function listHitProducts(
  query: ProductPaginationQuery,
): Promise<ProductListDto> {
  const { page, limit } = query
  await recalculateProductMetricsAndBadges()
  const where = buildCatalogWhereInput({ isHit: true })
  const orderBy = mapSortToOrderBy('newest')
  const { items, total } = await findProducts({ where, orderBy, page, limit })

  return toProductListDtoWithMarketplaceFlags(items, page, limit, total, 'HIT')
}

export async function listProductsByCategorySlug(
  slug: string,
  query: ProductCategoryPaginationQuery,
): Promise<ProductListDto> {
  const { page, limit } = query
  const categoryNode = await findCategoryBySlug(slug)

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
export async function searchProducts(
  query: ProductSearchQuery
): Promise<ProductListDto> {
  const { q, page, limit } = query

  const { items, total } = await repositorySearchProducts({ q, page, limit })

  return toProductListDtoWithMarketplaceFlags(items, page, limit, total, 'DEFAULT')
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

  return {
    ...toProductSummaryDto(product, product.variants, badgesByProductId.get(product.id) ?? [], 'DEFAULT'),
    images: toProductImageDto(product),
    storeName: product.store.name,
    storeSlug: product.store.slug,
    categoryName: product.category?.name ?? null,
    categorySlug: product.category?.slug ?? null,
    ratingSummary: toProductRatingSummaryDto(product),
    variants: product.variants.map(toProductVariantDto),
  }
}
