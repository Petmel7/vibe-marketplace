import { prisma } from '@/lib/prisma'
import type { ViewedProduct, Product } from '@/app/generated/prisma/client'
import type { ViewedIdentifier } from '@/features/viewed/viewed.types'

export type { ViewedIdentifier }
export { productExists } from '@/lib/db/productExists'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
 * Upsert a viewed-product record, then trim the list to MAX_VIEWED.
 *
 * The upsert uses Prisma's typed `upsert` (single `INSERT ... ON CONFLICT`
 * statement) against the composite unique constraint declared on the model.
 * The trim is a separate auto-commit statement — we deliberately do not wrap
 * the two in `prisma.$transaction`, because interactive transactions can
 * misbehave under transaction-mode connection pooling (Supabase/PgBouncer)
 * and surface a "no transaction in progress" (25P01) warning when the
 * implicit COMMIT lands on a connection that no longer holds the
 * transaction. Atomicity is not required here: if the trim fails the next
 * view triggers another trim, so the list is self-healing.
 */
export async function upsertViewedProduct(
  identifier: ViewedIdentifier,
  productId: string,
): Promise<void> {
  const now = new Date()

  if (isUser(identifier)) {
    const userId = identifier.userId

    await prisma.viewedProduct.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId, viewedAt: now },
      update: { viewedAt: now },
    })

    await prisma.$executeRaw`
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

    await prisma.viewedProduct.upsert({
      where: { sessionId_productId: { sessionId, productId } },
      create: { sessionId, productId, viewedAt: now },
      update: { viewedAt: now },
    })

    await prisma.$executeRaw`
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
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

/**
 * Move a guest session's viewed-product rows onto an authenticated user.
 *
 * Strategy (sequential Prisma calls, no interactive transaction):
 *   1. Read all guest rows for the session, newest first.
 *   2. For each guest row:
 *        - If the user already has a row for the same product, keep the more
 *          recent `viewedAt` on the user row and leave the guest row to be
 *          swept up below.
 *        - Otherwise rewrite the guest row in place (userId set, sessionId
 *          cleared) so we don't churn primary keys or break product joins.
 *   3. Delete any remaining guest rows for the session (these are the
 *      duplicates that conflicted in step 2).
 *   4. Trim the user's list to MAX_VIEWED to mirror upsertViewedProduct.
 *
 * We deliberately avoid `prisma.$transaction` here: under transaction-mode
 * connection pooling (Supabase / PgBouncer) interactive transactions emit a
 * spurious 25P01 "no transaction in progress" warning when the COMMIT lands
 * on a recycled connection. Merge is idempotent and self-healing: a partial
 * failure leaves at most some untransferred guest rows, which are harmless
 * (they won't be visible to the now-authenticated user) and can be retried.
 */
export async function mergeGuestViewedProducts(
  sessionId: string,
  userId: string,
): Promise<void> {
  const guestViews = await prisma.viewedProduct.findMany({
    where: { sessionId },
    orderBy: { viewedAt: 'desc' },
  })

  if (guestViews.length === 0) return

  for (const guest of guestViews) {
    const existing = await prisma.viewedProduct.findUnique({
      where: { userId_productId: { userId, productId: guest.productId } },
      select: { id: true, viewedAt: true },
    })

    if (existing) {
      if (guest.viewedAt > existing.viewedAt) {
        await prisma.viewedProduct.update({
          where: { id: existing.id },
          data: { viewedAt: guest.viewedAt },
        })
      }
      continue
    }

    await prisma.viewedProduct.update({
      where: { id: guest.id },
      data: { userId, sessionId: null },
    })
  }

  await prisma.viewedProduct.deleteMany({
    where: { sessionId },
  })

  const overflow = await prisma.viewedProduct.findMany({
    where: { userId },
    orderBy: { viewedAt: 'desc' },
    skip: MAX_VIEWED,
    select: { id: true },
  })

  if (overflow.length > 0) {
    await prisma.viewedProduct.deleteMany({
      where: { id: { in: overflow.map((row) => row.id) } },
    })
  }
}
