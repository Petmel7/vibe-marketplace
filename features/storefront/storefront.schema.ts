import { z } from 'zod'

const slugRegex = /^[a-z0-9-]+$/

export const slugSchema = z
  .string()
  .min(2)
  .max(100)
  .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens')

export const createStoreSchema = z.object({
  name: z.string().min(2).max(100),
  slug: slugSchema.optional(),
  description: z.string().max(1000).optional(),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
})

export const updateStoreSettingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional(),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  // slug is intentionally omitted — not updatable after creation
})

export type CreateStoreInput = z.infer<typeof createStoreSchema>
export type UpdateStoreSettingsInput = z.infer<typeof updateStoreSettingsSchema>
