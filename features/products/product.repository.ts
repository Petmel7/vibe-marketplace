import { prisma } from '@/lib/prisma'
import type {
  Category,
  Product,
  ProductVariant,
} from '@/app/generated/prisma/client'
import { Prisma } from '@/app/generated/prisma/client'

export type ProductWithVariants = Product & { variants: ProductVariant[] }
export type ProductListProduct = Product & { variants: ProductVariant[] }
export type CategoryNode = Pick<Category, 'id' | 'parentId'>

interface FindProductsParams {
  where: Prisma.ProductWhereInput
  orderBy: Prisma.ProductOrderByWithRelationInput[]
  page: number
  limit: number
}

interface FindProductsResult {
  items: ProductListProduct[]
  total: number
}

/**
 * Return a paginated list of active products using service-composed filters.
 *
 * The service owns business decisions like category-tree resolution,
 * filter composition, and sort mapping. The repository only executes Prisma
 * queries using those prepared Prisma inputs.
 */
export async function findProducts(
  params: FindProductsParams
): Promise<FindProductsResult> {
  const { where, orderBy, page, limit } = params
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        variants: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    }),
    prisma.product.count({ where }),
  ])

  return { items, total }
}

// ---------------------------------------------------------------------------
// Full-text search via searchVector
// ---------------------------------------------------------------------------

async function findProductsWithFullTextSearch(params: {
  search: string
  skip: number
  limit: number
}): Promise<FindProductsResult> {
  const { search, skip, limit } = params

  // $queryRaw is typed directly as Product[] — the adapter maps all scalar
  // columns (including Decimal price) to their Prisma types.
  const [items, countResult] = await Promise.all([
    prisma.$queryRaw<Product[]>`
    SELECT
      id,
      store_id   AS "storeId",
      category_id AS "categoryId",
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
      AND search_vector @@ plainto_tsquery('english', ${search})
    ORDER BY
      ts_rank(search_vector, plainto_tsquery('english', ${search})) DESC,
      created_at DESC,
      id DESC
    LIMIT ${limit} OFFSET ${skip}
  `,
    prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) AS count
    FROM products
    WHERE is_active = true
      AND search_vector @@ plainto_tsquery('english', ${search})
  `,
  ])

  return {
    items: await attachVariants(items),
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
 * Unlike catalog listing, this function is dedicated to the
 * /api/products/search route.
 */
export async function searchProducts(
  params: SearchProductsParams
): Promise<FindProductsResult> {
  const { q, page, limit } = params
  const skip = (page - 1) * limit
  return findProductsWithFullTextSearch({ search: q, skip, limit })
}

async function attachVariants(products: Product[]): Promise<ProductListProduct[]> {
  if (products.length === 0) {
    return []
  }

  const variants = await prisma.productVariant.findMany({
    where: {
      productId: {
        in: products.map((product) => product.id),
      },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })

  const variantsByProductId = new Map<string, ProductVariant[]>()

  for (const variant of variants) {
    const current = variantsByProductId.get(variant.productId) ?? []
    current.push(variant)
    variantsByProductId.set(variant.productId, current)
  }

  return products.map((product) => ({
    ...product,
    variants: variantsByProductId.get(product.id) ?? [],
  }))
}

export async function findCategoryBySlug(slug: string): Promise<CategoryNode | null> {
  return prisma.category.findFirst({
    where: {
      slug,
      isActive: true,
    },
    select: {
      id: true,
      parentId: true,
    },
  })
}

export async function findCategoriesByParentIds(
  parentIds: string[],
): Promise<CategoryNode[]> {
  if (parentIds.length === 0) {
    return []
  }

  return prisma.category.findMany({
    where: {
      parentId: {
        in: parentIds,
      },
      isActive: true,
    },
    select: {
      id: true,
      parentId: true,
    },
  })
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
