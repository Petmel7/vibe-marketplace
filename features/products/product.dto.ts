import type { MarketplaceBadgeSource, MarketplaceBadgeType } from '@/types/product-badges'
import type { ReviewRatingSummaryDto } from '@/features/review/review.dto'

/**
 * Data Transfer Objects for the Product feature.
 *
 * These types decouple the API contract from internal Prisma model shapes.
 * Decimal fields (price) are serialized as strings to avoid floating-point
 * precision loss and to be safe for JSON transport.
 */

export type ProductBadgeContext = 'DEFAULT' | 'NEW' | 'HIT' | 'FEATURED'
export type ProductStockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
export type ProductSearchSort =
  | 'relevance'
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'rating'
  | 'popular'

export interface ProductVariantDto {
  id: string
  sku: string
  size: string | null
  color: string | null
  /** Variant-level price override, serialized as string. Null means "use base product price". */
  price: string | null
  stock: number
}

export interface ProductMarketplaceBadgeDto {
  id: string
  type: MarketplaceBadgeType
  source: MarketplaceBadgeSource
  score: string | null
  startsAt: string | null
  endsAt: string | null
}

export interface ProductImageDto {
  id: string
  url: string
  altText: string | null
  isPrimary: boolean
  position: number
}

export interface ProductSummaryDto {
  id: string
  storeId: string
  href: string
  name: string
  description: string | null
  /** Base product price, serialized as string. */
  price: string
  imageUrl: string | null
  isActive: boolean
  inStock: boolean
  totalStock: number
  stockStatus: ProductStockStatus
  sku: string | null
  isHit: boolean
  isNew: boolean
  badgeContext: ProductBadgeContext
  badges: ProductMarketplaceBadgeDto[]
  ratingSummary: ReviewRatingSummaryDto
  createdAt: string
  variants: ProductVariantDto[]
}

export interface ProductDetailDto extends ProductSummaryDto {
  images: ProductImageDto[]
  storeName: string
  storeSlug: string
  categoryName: string | null
  categorySlug: string | null
  variants: ProductVariantDto[]
}

export interface ProductListMetaDto {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
}

export interface ProductListDto {
  badgeContext: ProductBadgeContext
  items: ProductSummaryDto[]
  total: number
  page: number
  totalPages: number
  data: ProductSummaryDto[]
  meta: ProductListMetaDto
}

export interface HomepageProductSectionsDto {
  newProducts: ProductSummaryDto[]
  hitProducts: ProductSummaryDto[]
}

export interface ProductFeedPageDto {
  items: ProductSummaryDto[]
  page: number
  hasNextPage: boolean
}

export interface ProductSearchItemDto extends ProductSummaryDto {
  storeName: string
  storeSlug: string
}

export interface ProductSearchCategoryFacetDto {
  id: string
  slug: string
  name: string
  count: number
}

export interface ProductSearchStoreFacetDto {
  id: string
  slug: string
  name: string
  count: number
}

export interface ProductSearchRatingFacetDto {
  minRating: number
  count: number
}

export interface ProductSearchBadgeFacetDto {
  type: MarketplaceBadgeType
  count: number
}

export interface ProductSearchAvailabilityFacetDto {
  inStock: number
  outOfStock: number
}

export interface ProductSearchPriceRangeFacetDto {
  min: string | null
  max: string | null
}

export interface ProductSearchFacetsDto {
  categories: ProductSearchCategoryFacetDto[]
  stores: ProductSearchStoreFacetDto[]
  availability: ProductSearchAvailabilityFacetDto
  ratings: ProductSearchRatingFacetDto[]
  badges: ProductSearchBadgeFacetDto[]
  priceRange: ProductSearchPriceRangeFacetDto
}

export interface ProductSearchAppliedFiltersDto {
  q: string | null
  category: string | null
  minPrice: number | null
  maxPrice: number | null
  inStock: boolean | null
  rating: number | null
  badge: MarketplaceBadgeType | null
  store: string | null
}

export interface ProductSearchDto {
  items: ProductSearchItemDto[]
  pagination: ProductListMetaDto
  facets: ProductSearchFacetsDto
  appliedFilters: ProductSearchAppliedFiltersDto
  sort: ProductSearchSort
}
