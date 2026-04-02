import { z } from 'zod'

/**
 * Query parameters for listing products.
 *
 * - storeId: optional UUID filter — only return products belonging to this store
 * - search:  optional full-text search string (max 100 chars)
 * - page:    1-based page number (defaults to 1)
 * - limit:   items per page, 1–100 (defaults to 20)
 *
 * Note: Zod v4 uses `error` (not `invalid_type_error`) for type-mismatch messages.
 */
export const productListQuerySchema = z.object({
  storeId: z
    .string()
    .uuid({ error: 'storeId must be a valid UUID' })
    .optional(),
  search: z
    .string()
    .max(100, { error: 'search must not exceed 100 characters' })
    .optional(),
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
    .default(20),
})

export type ProductListQuery = z.infer<typeof productListQuerySchema>

/**
 * Path parameter for single-product routes.
 *
 * - id: must be a valid UUID
 */
export const productIdParamSchema = z.object({
  id: z.string().uuid({ error: 'id must be a valid UUID' }),
})

export type ProductIdParam = z.infer<typeof productIdParamSchema>
