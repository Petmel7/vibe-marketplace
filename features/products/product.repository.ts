import { prisma } from '@/lib/prisma'
import type { Product, ProductVariant } from '@/app/generated/prisma/client'
import { Prisma } from '@/app/generated/prisma/client'

export type ProductWithVariants = Product & { variants: ProductVariant[] }

interface FindProductsParams {
  storeId?: string
  search?: string
  page: number
  limit: number
}

interface FindProductsResult {
  items: Product[]
  total: number
}

/**
 * Return a paginated list of active products.
 *
 * When `search` is provided the query uses PostgreSQL full-text search via
 * `searchVector @@ plainto_tsquery('english', ?)`. This requires `$queryRaw`
 * because Prisma has no native operator for `tsvector @@`.
 *
 * When there is no search term a standard `findMany` is used so Prisma can
 * apply its own query optimisations.
 *
 * N+1 note: count and items are fetched in parallel with Promise.all.
 */
export async function findProducts(
  params: FindProductsParams
): Promise<FindProductsResult> {
  const { storeId, search, page, limit } = params
  const skip = (page - 1) * limit

  if (search) {
    return findProductsWithFullTextSearch({ storeId, search, skip, limit })
  }

  return findProductsStandard({ storeId, skip, limit })
}

// ---------------------------------------------------------------------------
// Standard (no full-text search)
// ---------------------------------------------------------------------------

async function findProductsStandard(params: {
  storeId?: string
  skip: number
  limit: number
}): Promise<FindProductsResult> {
  const { storeId, skip, limit } = params

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(storeId ? { storeId } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ])

  return { items, total }
}

// ---------------------------------------------------------------------------
// Full-text search via searchVector
// ---------------------------------------------------------------------------

/**
 * Raw product row shape returned by the FTS query.
 * We select only scalar columns (no relations) — variants are excluded here
 * because this path returns ProductSummaryDto, not ProductDetailDto.
 */
type RawProductRow = {
  id: string
  storeId: string
  name: string
  description: string | null
  price: unknown          // Prisma returns Decimal-compatible object from raw
  imageUrl: string | null
  isActive: boolean
  sku: string | null
  isHit: boolean
  isNew: boolean
  createdAt: Date
  updatedAt: Date
}

async function findProductsWithFullTextSearch(params: {
  storeId?: string
  search: string
  skip: number
  limit: number
}): Promise<FindProductsResult> {
  const { storeId, search, skip, limit } = params

  // Build conditional storeId filter fragment.
  // We use Prisma.sql tagged template so all values are safely parameterized.
  const storeFilter = storeId
    ? Prisma.sql`AND "store_id" = ${storeId}::uuid`
    : Prisma.empty

  const [items, countResult] = await Promise.all([
    prisma.$queryRaw<RawProductRow[]>`
      SELECT
        id,
        store_id   AS "storeId",
        name,
        description,
        price,
        image_url  AS "imageUrl",
        is_active  AS "isActive",
        sku,
        is_hit     AS "isHit",
        is_new     AS "isNew",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM products
      WHERE is_active = true
        AND "searchVector" @@ plainto_tsquery('english', ${search})
        ${storeFilter}
      ORDER BY ts_rank("searchVector", plainto_tsquery('english', ${search})) DESC
      LIMIT ${limit} OFFSET ${skip}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count
      FROM products
      WHERE is_active = true
        AND "searchVector" @@ plainto_tsquery('english', ${search})
        ${storeFilter}
    `,
  ])

  // The raw query returns plain objects, not Prisma model instances, but the
  // shape is compatible — callers only access scalar fields on the list path.
  return {
    items: items as unknown as Product[],
    total: Number(countResult[0]?.count ?? 0),
  }
}

// ---------------------------------------------------------------------------
// Dedicated search (ts_rank ordered, no storeId filter)
// ---------------------------------------------------------------------------

interface SearchProductsParams {
  q: string
  page: number
  limit: number
}

/**
 * Full-text search across all active products, ranked by ts_rank.
 * Unlike findProducts this function requires a query term and does not
 * support store-scoping — it is intended for the /api/products/search route.
 */
export async function searchProducts(
  params: SearchProductsParams
): Promise<FindProductsResult> {
  const { q, page, limit } = params
  const skip = (page - 1) * limit
  return findProductsWithFullTextSearch({ search: q, skip, limit })
}

// ---------------------------------------------------------------------------
// Single product
// ---------------------------------------------------------------------------

/**
 * Find one active product by ID, including all its variants.
 * Returns null if not found or not active.
 */
export async function findProductById(
  id: string
): Promise<ProductWithVariants | null> {
  return prisma.product.findFirst({
    where: { id, isActive: true },
    include: { variants: true },
  })
}
