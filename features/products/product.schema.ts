import { z } from 'zod'
import { ProductBadgeType } from '@/app/generated/prisma/client'

const optionalQueryNumber = (fieldName: string) =>
  z.preprocess(
    (value) => {
      if (value === '' || value == null) {
        return undefined
      }

      return value
    },
    z.coerce.number({ error: `${fieldName} must be a number` }).nonnegative({
      error: `${fieldName} must be greater than or equal to 0`,
    }).optional(),
  )

export const productPaginationQuerySchema = z.object({
  page: z.coerce
    .number({ error: 'page must be a number' })
    .int({ error: 'page must be an integer' })
    .min(1, { error: 'page must be at least 1' })
    .default(1),
  limit: z.coerce
    .number({ error: 'limit must be a number' })
    .int({ error: 'limit must be an integer' })
    .min(1, { error: 'limit must be at least 1' })
    .max(100, { error: 'limit must not exceed 100' })
    .default(12),
})

export type ProductPaginationQuery = z.infer<typeof productPaginationQuerySchema>

/**
 * Query parameters for listing products.
 *
 * - storeId: optional UUID filter — only return products belonging to this store
 * - search:  optional full-text search string (max 100 chars)
 * - page:    1-based page number (defaults to 1)
 * - limit:   items per page, 1–100 (defaults to 12)
 *
 * Note: Zod v4 uses `error` (not `invalid_type_error`) for type-mismatch messages.
 */
export const productListQuerySchema = productPaginationQuerySchema.extend({
  storeId: z
    .string()
    .uuid({ error: 'storeId must be a valid UUID' })
    .optional(),
  category: z
    .string()
    .trim()
    .min(1, { error: 'category must not be empty' })
    .optional(),
  size: z
    .string()
    .trim()
    .min(1, { error: 'size must not be empty' })
    .optional(),
  priceMin: optionalQueryNumber('priceMin'),
  priceMax: optionalQueryNumber('priceMax'),
  sort: z.enum(['price_asc', 'price_desc', 'newest']).default('newest'),
}).superRefine((query, ctx) => {
  if (
    query.priceMin !== undefined &&
    query.priceMax !== undefined &&
    query.priceMin > query.priceMax
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'priceMin must be less than or equal to priceMax',
      path: ['priceMin'],
    })
  }
})

export type ProductListQuery = z.infer<typeof productListQuerySchema>

export const productCategoryPaginationQuerySchema = z.object({
  page: z.coerce
    .number({ error: 'page must be a number' })
    .int({ error: 'page must be an integer' })
    .min(1, { error: 'page must be at least 1' })
    .default(1),
  limit: z.coerce
    .number({ error: 'limit must be a number' })
    .int({ error: 'limit must be an integer' })
    .min(1, { error: 'limit must be at least 1' })
    .max(50, { error: 'limit must not exceed 50' })
    .default(12),
})

export type ProductCategoryPaginationQuery = z.infer<typeof productCategoryPaginationQuerySchema>

/**
 * Query parameters for the dedicated search endpoint.
 *
 * - q:     required search string (1–100 chars), used for FTS
 * - page:  1-based page number (defaults to 1)
 * - limit: items per page, 1–100 (defaults to 12)
 */
export const productSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100, { error: 'q must not exceed 100 characters' })
    .optional(),
  category: z
    .string()
    .trim()
    .min(1, { error: 'category must not be empty' })
    .optional(),
  minPrice: optionalQueryNumber('minPrice'),
  maxPrice: optionalQueryNumber('maxPrice'),
  inStock: z.preprocess((value) => {
    if (value === '' || value == null) {
      return undefined
    }

    if (typeof value === 'boolean') {
      return value
    }

    if (typeof value === 'string') {
      if (value === 'true') return true
      if (value === 'false') return false
    }

    return value
  }, z.boolean({ error: 'inStock must be true or false' }).optional()),
  rating: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    z.coerce
      .number({ error: 'rating must be a number' })
      .int({ error: 'rating must be an integer' })
      .min(1, { error: 'rating must be at least 1' })
      .max(5, { error: 'rating must not exceed 5' })
      .optional(),
  ),
  badge: z.nativeEnum(ProductBadgeType).optional(),
  store: z
    .string()
    .trim()
    .min(1, { error: 'store must not be empty' })
    .max(120, { error: 'store must not exceed 120 characters' })
    .optional(),
  sort: z.enum(['relevance', 'newest', 'price_asc', 'price_desc', 'rating', 'popular']).optional(),
  page: z.coerce
    .number({ error: 'page must be a number' })
    .int({ error: 'page must be an integer' })
    .min(1, { error: 'page must be at least 1' })
    .default(1),
  limit: z.coerce
    .number({ error: 'limit must be a number' })
    .int({ error: 'limit must be an integer' })
    .min(1, { error: 'limit must be at least 1' })
    .max(100, { error: 'limit must not exceed 100' })
    .default(12),
}).superRefine((query, ctx) => {
  if (
    query.minPrice !== undefined &&
    query.maxPrice !== undefined &&
    query.minPrice > query.maxPrice
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'minPrice must be less than or equal to maxPrice',
      path: ['minPrice'],
    })
  }
})

export type ProductSearchQuery = z.infer<typeof productSearchQuerySchema>

/**
 * Path parameter for single-product routes.
 *
 * - id: must be a valid UUID
 */
export const productIdParamSchema = z.object({
  id: z.string().uuid({ error: 'id must be a valid UUID' }),
})

export type ProductIdParam = z.infer<typeof productIdParamSchema>

export const productCategorySlugParamSchema = z.object({
  slug: z
    .string({ error: 'slug is required' })
    .trim()
    .min(1, { error: 'slug must not be empty' }),
})

export type ProductCategorySlugParam = z.infer<typeof productCategorySlugParamSchema>
