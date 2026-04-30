import { Prisma } from '@/app/generated/prisma/client'
import type { Product, ProductVariant } from '@/app/generated/prisma/client'
import type {
  ProductDetailDto,
  ProductListDto,
  ProductSummaryDto,
  ProductVariantDto,
} from '@/features/products/product.dto'
import {
  findCategoriesByParentIds,
  findCategoryBySlug,
  findProductById,
  findProducts,
  searchProducts as repositorySearchProducts,
} from '@/features/products/product.repository'
import type {
  CategoryNode,
  ProductListProduct,
} from '@/features/products/product.repository'
import type {
  ProductCategoryPaginationQuery,
  ProductListQuery,
  ProductPaginationQuery,
  ProductSearchQuery,
} from '@/features/products/product.schema'

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
  product: Product,
  variants: ProductVariant[] = [],
): ProductSummaryDto {
  return {
    id: product.id,
    storeId: product.storeId,
    name: product.name,
    description: product.description ?? null,
    price: product.price.toString(),
    imageUrl: product.imageUrl ?? null,
    isActive: product.isActive,
    sku: product.sku ?? null,
    isHit: product.isHit,
    isNew: product.isNew,
    createdAt: product.createdAt.toISOString(),
    variants: variants.map(toProductVariantDto),
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

function toProductListDto(
  items: Array<Product | ProductListProduct>,
  page: number,
  limit: number,
  total: number,
): ProductListDto {
  const mappedItems = items.map((item) =>
    toProductSummaryDto(item, 'variants' in item ? item.variants : []),
  )
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit)

  return {
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

function emptyProductListDto(page: number, limit: number): ProductListDto {
  return {
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

  const priceFilter: Prisma.DecimalFilter<'Product'> | undefined =
    priceMin !== undefined || priceMax !== undefined
      ? {
          ...(priceMin !== undefined ? { gte: priceMin } : {}),
          ...(priceMax !== undefined ? { lte: priceMax } : {}),
        }
      : undefined

  return {
    isActive: true,
    ...(storeId ? { storeId } : {}),
    ...(isNew !== undefined ? { isNew } : {}),
    ...(isHit !== undefined ? { isHit } : {}),
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

  return toProductListDto(items, page, limit, total)
}

export async function listNewProducts(
  query: ProductPaginationQuery,
): Promise<ProductListDto> {
  const { page, limit } = query
  const where = buildCatalogWhereInput({ isNew: true })
  const orderBy = mapSortToOrderBy('newest')
  const { items, total } = await findProducts({ where, orderBy, page, limit })

  return toProductListDto(items, page, limit, total)
}

export async function listHitProducts(
  query: ProductPaginationQuery,
): Promise<ProductListDto> {
  const { page, limit } = query
  const where = buildCatalogWhereInput({ isHit: true })
  const orderBy = mapSortToOrderBy('newest')
  const { items, total } = await findProducts({ where, orderBy, page, limit })

  return toProductListDto(items, page, limit, total)
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

  return toProductListDto(items, page, limit, total)
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

  return toProductListDto(items, page, limit, total)
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
