/**
 * Data Transfer Objects for the Product feature.
 *
 * These types decouple the API contract from internal Prisma model shapes.
 * Decimal fields (price) are serialized as strings to avoid floating-point
 * precision loss and to be safe for JSON transport.
 */

export interface ProductVariantDto {
  id: string
  sku: string
  size: string | null
  color: string | null
  /** Variant-level price override, serialized as string. Null means "use base product price". */
  price: string | null
  stock: number
}

export interface ProductSummaryDto {
  id: string
  storeId: string
  name: string
  description: string | null
  /** Base product price, serialized as string. */
  price: string
  imageUrl: string | null
  isActive: boolean
  sku: string | null
  isHit: boolean
  isNew: boolean
  createdAt: string
}

export interface ProductDetailDto extends ProductSummaryDto {
  variants: ProductVariantDto[]
}

export interface ProductListMetaDto {
  page: number
  limit: number
  total: number
  hasNextPage: boolean
}

export interface ProductListDto {
  data: ProductSummaryDto[]
  meta: ProductListMetaDto
}
