import { z } from 'zod'

export const sellerStoreContextQuerySchema = z.object({
  storeId: z.string().uuid().optional(),
})

export const updateStoreSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  isActive: z.boolean().optional(),
})

export type UpdateStoreInput = z.infer<typeof updateStoreSchema>
export type SellerStoreContextQueryInput = z.infer<typeof sellerStoreContextQuerySchema>
