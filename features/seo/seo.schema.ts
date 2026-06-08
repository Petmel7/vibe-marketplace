import { SeoEntityType } from '@/app/generated/prisma/enums'
import { z } from 'zod'

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const seoTextSchema = z.string().trim().min(1)

const nullableSeoTextSchema = z.union([seoTextSchema, z.null()]).optional()

const optionalUrlSchema = z.union([z.url(), z.null()]).optional()

export const seoEntityIdentifierSchema = z.string().trim().min(1).max(191)

export const seoMetadataBaseSchema = z.object({
  entityType: z.nativeEnum(SeoEntityType),
  entityId: z.union([seoEntityIdentifierSchema, z.null()]).optional(),
  title: z.string().trim().min(1, 'SEO title is required').max(120, 'SEO title must be 120 characters or fewer'),
  description: z.union([z.string().trim().max(320), z.null()]).optional(),
  keywords: nullableSeoTextSchema,
  canonicalUrl: optionalUrlSchema,
  ogTitle: z.union([z.string().trim().max(120), z.null()]).optional(),
  ogDescription: z.union([z.string().trim().max(320), z.null()]).optional(),
  ogImageUrl: optionalUrlSchema,
  noIndex: z.boolean().optional(),
  noFollow: z.boolean().optional(),
})

function validateEntityConsistency(
  entityType: SeoEntityType | undefined,
  entityId: string | null | undefined,
  ctx: z.RefinementCtx,
) {
  if (!entityType) {
    return
  }

  const normalizedEntityId = entityId ?? null

  if (entityType === SeoEntityType.GLOBAL && normalizedEntityId !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['entityId'],
      message: 'GLOBAL SEO metadata must not include entityId',
    })
  }

  if (entityType !== SeoEntityType.GLOBAL && !normalizedEntityId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['entityId'],
      message: 'entityId is required for PAGE, PRODUCT, CATEGORY, and STORE SEO metadata',
    })
  }
}

export const createSeoMetadataSchema = seoMetadataBaseSchema.superRefine((input, ctx) => {
  validateEntityConsistency(input.entityType, input.entityId, ctx)
})

export const updateSeoMetadataSchema = seoMetadataBaseSchema.partial().superRefine((input, ctx) => {
  if (Object.keys(input).length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one SEO field must be provided',
    })
  }

  validateEntityConsistency(input.entityType, input.entityId, ctx)
})

export const seoListQuerySchema = paginationSchema.extend({
  entityType: z.nativeEnum(SeoEntityType).optional(),
  entityId: seoEntityIdentifierSchema.optional(),
})
