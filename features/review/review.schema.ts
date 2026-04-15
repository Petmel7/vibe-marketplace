import { z } from 'zod'

/**
 * Request body for POST /api/products/[id]/reviews.
 *
 * Note: Zod v4 uses `error` (not `invalid_type_error`) for type-mismatch messages.
 */
export const reviewCreateSchema = z.object({
  rating: z
    .number({ error: 'rating must be a number' })
    .int({ error: 'rating must be an integer' })
    .min(1, { error: 'rating must be at least 1' })
    .max(5, { error: 'rating must not exceed 5' }),
  comment: z
    .string()
    .max(2000, { error: 'comment must not exceed 2000 characters' })
    .optional(),
})

export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>

/**
 * Query parameters for GET /api/products/[id]/reviews.
 */
export const reviewListQuerySchema = z.object({
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

export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>
