import { prisma } from '@/lib/prisma'
import type { ViewedProduct, Product } from '@/app/generated/prisma/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Discriminated union — exactly one field is set, matching the DB CHECK
 * constraint that enforces one non-null identifier column per row.
 */
export type ViewedIdentifier = { userId: string } | { sessionId: string }

export type ViewedProductWithProduct = ViewedProduct & { product: Product }

/** Maximum number of recently viewed products retained per identifier. */
const MAX_VIEWED = 20

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isUser(id: ViewedIdentifier): id is { userId: string } {
  return 'userId' in id
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Return the most-recently viewed products for an identifier, newest first.
 * At most MAX_VIEWED rows are returned — the trim query ensures the DB never
 * holds more, but we apply take() here defensively.
 */
export async function findRecentlyViewed(
  identifier: ViewedIdentifier,
): Promise<ViewedProductWithProduct[]> {
  const where = isUser(identifier)
    ? { userId: identifier.userId }
    : { sessionId: identifier.sessionId }

  return prisma.viewedProduct.findMany({
    where,
    include: { product: true },
    orderBy: { viewedAt: 'desc' },
    take: MAX_VIEWED,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Upsert a viewed-product record and trim the list to MAX_VIEWED, atomically.
 *
 * ON CONFLICT targets the partial unique indexes created in the migration:
 *   idx_viewed_user_product    (user_id, product_id)    WHERE user_id IS NOT NULL
 *   idx_viewed_session_product (session_id, product_id) WHERE session_id IS NOT NULL
 *
 * Re-viewing an already-viewed product updates viewed_at to now(), which
 * moves it to the top of the list without creating a duplicate row.
 */
export async function upsertViewedProduct(
  identifier: ViewedIdentifier,
  productId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    if (isUser(identifier)) {
      const userId = identifier.userId

      await tx.$executeRaw`
        INSERT INTO viewed_products (id, user_id, product_id, viewed_at)
        VALUES (gen_random_uuid(), ${userId}::uuid, ${productId}::uuid, now())
        ON CONFLICT (user_id, product_id) WHERE user_id IS NOT NULL
        DO UPDATE SET viewed_at = now()
      `

      await tx.$executeRaw`
        DELETE FROM viewed_products
        WHERE user_id = ${userId}::uuid
          AND id NOT IN (
            SELECT id FROM viewed_products
            WHERE user_id = ${userId}::uuid
            ORDER BY viewed_at DESC
            LIMIT ${MAX_VIEWED}
          )
      `
    } else {
      const sessionId = identifier.sessionId

      await tx.$executeRaw`
        INSERT INTO viewed_products (id, session_id, product_id, viewed_at)
        VALUES (gen_random_uuid(), ${sessionId}, ${productId}::uuid, now())
        ON CONFLICT (session_id, product_id) WHERE session_id IS NOT NULL
        DO UPDATE SET viewed_at = now()
      `

      await tx.$executeRaw`
        DELETE FROM viewed_products
        WHERE session_id = ${sessionId}
          AND id NOT IN (
            SELECT id FROM viewed_products
            WHERE session_id = ${sessionId}
            ORDER BY viewed_at DESC
            LIMIT ${MAX_VIEWED}
          )
      `
    }
  })
}

/**
 * Check whether an active product with the given id exists.
 * Used by the service layer to validate before recording a view.
 */
export async function productExists(productId: string): Promise<boolean> {
  const count = await prisma.product.count({
    where: { id: productId, isActive: true },
  })
  return count > 0
}
