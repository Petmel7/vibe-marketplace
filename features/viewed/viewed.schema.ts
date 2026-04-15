import { z } from 'zod'

/**
 * Request body for POST /api/viewed — record a product view.
 */
export const viewedRecordSchema = z.object({
  productId: z.string().uuid({ error: 'productId must be a valid UUID' }),
})

export type ViewedRecordInput = z.infer<typeof viewedRecordSchema>
