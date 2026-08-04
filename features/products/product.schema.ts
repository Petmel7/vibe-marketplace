import { z } from 'zod'
import { ProductBadgeType } from '@/app/generated/prisma/client'
import {
  defaultedQueryNumber,
  defaultedQueryParam,
  optionalQueryBoolean,
  optionalQueryNumber,
  optionalQueryParam,
  optionalQueryString,
} from '@/lib/validation/query'

export const productPaginationQuerySchema = z.object({
  page: defaultedQueryNumber(
    z.coerce
      .number({ error: 'page must be a number' })
      .int({ error: 'page must be an integer' })
      .min(1, { error: 'page must be at least 1' }),
    1,
  ),
  limit: defaultedQueryNumber(
    z.coerce
      .number({ error: 'limit must be a number' })
      .int({ error: 'limit must be an integer' })
      .min(1, { error: 'limit must be at least 1' })
      .max(100, { error: 'limit must not exceed 100' }),
    12,
  ),
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
  storeId: optionalQueryParam(z.string().uuid({ error: 'storeId must be a valid UUID' })),
  category: optionalQueryString(z.string().trim().min(1, { error: 'category must not be empty' })),
  size: optionalQueryString(z.string().trim().min(1, { error: 'size must not be empty' })),
  priceMin: optionalQueryNumber(
    z.coerce.number({ error: 'priceMin must be a number' }).nonnegative({
      error: 'priceMin must be greater than or equal to 0',
    }),
  ),
  priceMax: optionalQueryNumber(
    z.coerce.number({ error: 'priceMax must be a number' }).nonnegative({
      error: 'priceMax must be greater than or equal to 0',
    }),
  ),
  sort: defaultedQueryParam(z.enum(['price_asc', 'price_desc', 'newest']), 'newest'),
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
  page: defaultedQueryNumber(
    z.coerce
      .number({ error: 'page must be a number' })
      .int({ error: 'page must be an integer' })
      .min(1, { error: 'page must be at least 1' }),
    1,
  ),
  limit: defaultedQueryNumber(
    z.coerce
      .number({ error: 'limit must be a number' })
      .int({ error: 'limit must be an integer' })
      .min(1, { error: 'limit must be at least 1' })
      .max(50, { error: 'limit must not exceed 50' }),
    12,
  ),
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
  q: optionalQueryString(z.string().trim().max(100, { error: 'q must not exceed 100 characters' })),
  category: optionalQueryString(z.string().trim().min(1, { error: 'category must not be empty' })),
  minPrice: optionalQueryNumber(
    z.coerce.number({ error: 'minPrice must be a number' }).nonnegative({
      error: 'minPrice must be greater than or equal to 0',
    }),
  ),
  maxPrice: optionalQueryNumber(
    z.coerce.number({ error: 'maxPrice must be a number' }).nonnegative({
      error: 'maxPrice must be greater than or equal to 0',
    }),
  ),
  inStock: optionalQueryBoolean(),
  rating: optionalQueryNumber(
    z.coerce
      .number({ error: 'rating must be a number' })
      .int({ error: 'rating must be an integer' })
      .min(1, { error: 'rating must be at least 1' })
      .max(5, { error: 'rating must not exceed 5' })
  ),
  badge: optionalQueryParam(z.nativeEnum(ProductBadgeType)),
  store: optionalQueryString(
    z
      .string()
      .trim()
      .min(1, { error: 'store must not be empty' })
      .max(120, { error: 'store must not exceed 120 characters' }),
  ),
  sort: optionalQueryParam(z.enum(['relevance', 'newest', 'price_asc', 'price_desc', 'rating', 'popular'])),
  page: defaultedQueryNumber(
    z.coerce
      .number({ error: 'page must be a number' })
      .int({ error: 'page must be an integer' })
      .min(1, { error: 'page must be at least 1' }),
    1,
  ),
  limit: defaultedQueryNumber(
    z.coerce
      .number({ error: 'limit must be a number' })
      .int({ error: 'limit must be an integer' })
      .min(1, { error: 'limit must be at least 1' })
      .max(100, { error: 'limit must not exceed 100' }),
    12,
  ),
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
