import { z } from 'zod'

const slugRegex = /^[a-z0-9-]+$/

const categoryIdSchema = z.string().trim().min(1).max(191)
const categorySlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens')

export const categoryIdParamSchema = z.object({
  id: categoryIdSchema,
})

export const createAdminCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: categorySlugSchema.nullish(),
  parentId: categoryIdSchema.nullish(),
  position: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const updateAdminCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    slug: categorySlugSchema.nullish(),
    parentId: categoryIdSchema.nullish(),
    position: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  })

export const reorderAdminCategoriesSchema = z.object({
  items: z
    .array(
      z.object({
        id: categoryIdSchema,
        position: z.coerce.number().int().min(0),
      }),
    )
    .min(1),
})
