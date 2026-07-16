import { z } from 'zod'
import { ALLOWED_PRODUCT_SIZES } from './seller-product.sizes'
import {
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  PRODUCT_IMAGE_ALT_TEXT_MAX_LENGTH,
  PRODUCT_IMAGE_LIMIT,
  PRODUCT_IMAGE_STORAGE_PATH_MAX_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MIN_LENGTH,
  PRODUCT_PRICE_MAX,
  PRODUCT_PRICE_MIN,
  PRODUCT_SKU_MAX_LENGTH,
  PRODUCT_VARIANT_COLOR_MAX_LENGTH,
  PRODUCT_VARIANT_LIMIT,
  PRODUCT_VARIANT_STOCK_MAX,
  isMoneyValueInRange,
} from './seller-product.validation'

const priceString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid positive decimal')
  .refine(isMoneyValueInRange, `Must be between ${PRODUCT_PRICE_MIN} and ${PRODUCT_PRICE_MAX}`)

const storagePathString = z.string().trim().min(1).max(PRODUCT_IMAGE_STORAGE_PATH_MAX_LENGTH)
const skuString = z.string().trim().min(1).max(PRODUCT_SKU_MAX_LENGTH)

export const sellerProductImageSchema = z.object({
  url: z.string().url(),
  storagePath: storagePathString,
  altText: z.string().trim().max(PRODUCT_IMAGE_ALT_TEXT_MAX_LENGTH).nullable().optional(),
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
  size: z.enum(ALLOWED_PRODUCT_SIZES).nullable().optional(),
  color: z.string().trim().max(PRODUCT_VARIANT_COLOR_MAX_LENGTH).nullable().optional(),
  price: priceString.nullable().optional(),
  stock: z.number().int().min(0).max(PRODUCT_VARIANT_STOCK_MAX).optional(),
})

export const createSellerProductSchema = z.object({
  storeId: z.string().uuid().optional(),
  name: z.string().trim().min(PRODUCT_NAME_MIN_LENGTH).max(PRODUCT_NAME_MAX_LENGTH),
  description: z.string().trim().max(PRODUCT_DESCRIPTION_MAX_LENGTH).nullable().optional(),
  price: priceString,
  imageUrl: z.string().url().nullable().optional(),
  sku: skuString.nullable().optional(),
  categoryId: z.string().min(1).max(191).nullable().optional(),
  images: z.array(sellerProductImageSchema).max(PRODUCT_IMAGE_LIMIT).optional(),
  variants: z.array(createVariantSchema).max(PRODUCT_VARIANT_LIMIT).optional(),
}).strict()

export const updateSellerProductSchema = createSellerProductSchema
  .omit({ variants: true, storeId: true })
  .partial()
  .strict()

export const updateVariantSchema = createVariantSchema.partial()

export const updateInventorySchema = z.object({
  stock: z.number().int().min(0).max(PRODUCT_VARIANT_STOCK_MAX),
})

export type CreateSellerProductInput = z.infer<typeof createSellerProductSchema>
export type UpdateSellerProductInput = z.infer<typeof updateSellerProductSchema>
export type CreateVariantInput = z.infer<typeof createVariantSchema>
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>
export type SellerProductListQueryInput = z.infer<typeof sellerProductListQuerySchema>
