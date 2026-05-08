import { z } from 'zod'

const priceString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid positive decimal')

export const createVariantSchema = z.object({
  sku: z.string().max(100).optional(),
  size: z.string().max(50).nullable().optional(),
  color: z.string().max(50).nullable().optional(),
  price: priceString.nullable().optional(),
  stock: z.number().int().min(0).optional(),
})

export const createSellerProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  price: priceString,
  imageUrl: z.string().url().nullable().optional(),
  sku: z.string().max(100).nullable().optional(),
  isHit: z.boolean().optional(),
  isNew: z.boolean().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  variants: z.array(createVariantSchema).optional(),
})

export const updateSellerProductSchema = createSellerProductSchema
  .omit({ variants: true })
  .partial()

export const updateVariantSchema = createVariantSchema.partial()

export const updateInventorySchema = z.object({
  stock: z.number().int().min(0),
})

export type CreateSellerProductInput = z.infer<typeof createSellerProductSchema>
export type UpdateSellerProductInput = z.infer<typeof updateSellerProductSchema>
export type CreateVariantInput = z.infer<typeof createVariantSchema>
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>
