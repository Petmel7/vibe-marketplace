import {
  findRecentlyViewed,
  upsertViewedProduct,
  productExists,
} from '@/features/viewed/viewed.repository'
import type { ViewedProductWithProduct } from '@/features/viewed/viewed.repository'
import type { ViewedIdentifier } from '@/features/viewed/viewed.types'
import type {
  ViewedListDto,
  ViewedProductDto,
  ViewedRecordResultDto,
} from '@/features/viewed/viewed.dto'
import type { ViewedRecordInput } from '@/features/viewed/viewed.schema'
import { scheduleProductMetricsRecalculation } from '@/features/products/product-metrics.jobs'

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export type { ViewedIdentifier }

// ---------------------------------------------------------------------------
// Typed application errors
// ---------------------------------------------------------------------------

export class ProductNotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const

  constructor(productId: string) {
    super(`Product "${productId}" was not found or is not active`)
    this.name = 'ProductNotFoundError'
  }
}

// ---------------------------------------------------------------------------
// DTO mapper
// ---------------------------------------------------------------------------

function toDto(row: ViewedProductWithProduct): ViewedProductDto {
  return {
    id: row.id,
    productId: row.productId,
    name: row.product.name,
    price: row.product.price.toString(),
    imageUrl: row.product.imageUrl ?? null,
    viewedAt: row.viewedAt.toISOString(),
  }
}

function buildViewedMetricsDedupeKey(
  identifier: ViewedIdentifier,
  productId: string,
): string {
  const ownerKey = 'userId' in identifier ? identifier.userId : identifier.sessionId
  const minuteBucket = new Date().toISOString().slice(0, 16)

  return `product-metrics:viewed:${ownerKey}:${productId}:${minuteBucket}`
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Return the recently viewed product list for a user or guest session.
 * Returns an empty list if nothing has been viewed yet — never throws.
 */
export async function getRecentlyViewed(identifier: ViewedIdentifier): Promise<ViewedListDto> {
  const rows = await findRecentlyViewed(identifier)
  return { items: rows.map(toDto) }
}

/**
 * Record a product view for a user or guest session, then return the
 * updated recently viewed list.
 *
 * Behaviour:
 *   - Product not found/inactive  → throws ProductNotFoundError
 *   - Already viewed              → moves product to top (updates viewedAt)
 *   - New view                    → prepends product; list capped at 20
 *
 * Throws:
 *   ProductNotFoundError — product does not exist or is not active
 */
export async function recordView(
  identifier: ViewedIdentifier,
  input: ViewedRecordInput,
): Promise<ViewedRecordResultDto> {
  const { productId } = input

  if (!(await productExists(productId))) {
    throw new ProductNotFoundError(productId)
  }

  await upsertViewedProduct(identifier, productId)

  scheduleProductMetricsRecalculation({
    reason: 'product-viewed',
    dedupeKey: buildViewedMetricsDedupeKey(identifier, productId),
  })

  return { recorded: true }
}
