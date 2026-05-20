import { z } from 'zod'

export const storeAssetKindSchema = z.enum(['logo', 'banner'])

const formBoolean = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }

  return value
}, z.boolean())

export const productImageUploadMetadataSchema = z.object({
  altText: z.string().max(200).optional(),
  position: z.coerce.number().int().min(0).optional(),
  isPrimary: formBoolean.optional(),
})

export const removeProductImageSchema = z.object({
  imageId: z.string().uuid(),
})

export const reorderProductImagesSchema = z.object({
  images: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    }),
  ).min(1),
})

export const setPrimaryProductImageSchema = z.object({
  imageId: z.string().uuid(),
})

export type ProductImageUploadMetadataInput = z.infer<typeof productImageUploadMetadataSchema>
export type ReorderProductImagesInput = z.infer<typeof reorderProductImagesSchema>
export type SetPrimaryProductImageInput = z.infer<typeof setPrimaryProductImageSchema>
