import {
  findProducts,
  findProductById,
} from '@/features/products/product.repository'
import type {
  ProductDetailDto,
  ProductListDto,
  ProductSummaryDto,
  ProductVariantDto,
} from '@/features/products/product.dto'
import type { ProductListQuery } from '@/features/products/product.schema'
import type { Product, ProductVariant } from '@/app/generated/prisma/client'

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
function toProductSummaryDto(product: Product): ProductSummaryDto {
  return {
    id: product.id,
    storeId: product.storeId,
    name: product.name,
    description: product.description ?? null,
    price: product.price.toString(),
    imageUrl: product.imageUrl ?? null,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
  }
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

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * List active products with optional filtering and pagination.
 *
 * Edge cases handled:
 * - Invalid storeId / search are validated upstream by Zod before this runs.
 * - When page exceeds the available data an empty items array is returned
 *   (not an error), total still reflects the real count.
 */
export async function listProducts(
  query: ProductListQuery
): Promise<ProductListDto> {
  const { storeId, search, page, limit } = query

  const { items, total } = await findProducts({ storeId, search, page, limit })

  return {
    items: items.map(toProductSummaryDto),
    total,
    page,
    limit,
  }
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

  return {
    ...toProductSummaryDto(product),
    variants: product.variants.map(toProductVariantDto),
  }
}
