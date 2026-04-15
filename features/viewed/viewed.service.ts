import {
  findRecentlyViewed,
  upsertViewedProduct,
  productExists,
} from '@/features/viewed/viewed.repository'
import type { ViewedIdentifier, ViewedProductWithProduct } from '@/features/viewed/viewed.repository'
import type { ViewedRecordInput } from '@/features/viewed/viewed.schema'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { ViewedIdentifier }

interface ViewedProductDto {
  id: string
  productId: string
  name: string
  /** Product base price, serialized as string. */
  price: string
  imageUrl: string | null
  viewedAt: string
}

interface ViewedListDto {
  items: ViewedProductDto[]
}

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
): Promise<ViewedListDto> {
  const { productId } = input

  if (!(await productExists(productId))) {
    throw new ProductNotFoundError(productId)
  }

  await upsertViewedProduct(identifier, productId)

  const rows = await findRecentlyViewed(identifier)
  return { items: rows.map(toDto) }
}
