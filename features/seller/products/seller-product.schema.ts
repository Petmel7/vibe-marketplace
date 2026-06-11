import { z } from 'zod'

const priceString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid positive decimal')

const storagePathString = z.string().min(1).max(512)
const skuString = z.string().trim().min(1).max(100)

export const sellerProductImageSchema = z.object({
  url: z.string().url(),
  storagePath: storagePathString,
  altText: z.string().max(200).nullable().optional(),
  position: z.number().int().min(0).optional(),
  isPrimary: z.boolean().optional(),
})

export const sellerProductListQuerySchema = z.object({
  storeId: z.string().uuid().optional(),
  status: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const createVariantSchema = z.object({
  sku: skuString.optional(),
  size: z.string().max(50).nullable().optional(),
  color: z.string().max(50).nullable().optional(),
  price: priceString.nullable().optional(),
  stock: z.number().int().min(0).optional(),
})

export const createSellerProductSchema = z.object({
  storeId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  price: priceString,
  imageUrl: z.string().url().nullable().optional(),
  sku: skuString.nullable().optional(),
  categoryId: z.string().min(1).max(191).nullable().optional(),
  images: z.array(sellerProductImageSchema).max(10).optional(),
  variants: z.array(createVariantSchema).optional(),
}).strict()

export const updateSellerProductSchema = createSellerProductSchema
  .omit({ variants: true, storeId: true })
  .partial()
  .strict()

export const updateVariantSchema = createVariantSchema.partial()

export const updateInventorySchema = z.object({
  stock: z.number().int().min(0),
})

export type CreateSellerProductInput = z.infer<typeof createSellerProductSchema>
export type UpdateSellerProductInput = z.infer<typeof updateSellerProductSchema>
export type CreateVariantInput = z.infer<typeof createVariantSchema>
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>
export type SellerProductListQueryInput = z.infer<typeof sellerProductListQuerySchema>
