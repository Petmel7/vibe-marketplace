import {
  HeroBannerDestinationType,
  HeroBannerStatus,
} from '@/app/generated/prisma/client'
import { z } from 'zod'

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const nullableTrimmedString = (max: number) =>
  z
    .preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
      z.string().trim().max(max).nullable(),
    )
    .optional()

const nullableUuid = z.string().uuid().nullable().optional()
const nullableCategoryId = z.string().trim().min(1).max(128).nullable().optional()
const isoDateTimeSchema = z.string().datetime({ offset: true })
const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/)

const internalCustomUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => value.startsWith('/') && !value.startsWith('//'), {
    message: 'Custom URL must be an internal relative path',
  })
  .refine((value) => !value.includes('://') && !/[\u0000-\u001F]/.test(value), {
    message: 'Custom URL must be a safe internal path',
  })

const heroBannerBaseSchema = z.object({
  eyebrow: nullableTrimmedString(80),
  title: z.string().trim().min(1, 'Hero banner title is required').max(160),
  subtitle: nullableTrimmedString(200),
  description: nullableTrimmedString(1000),
  desktopImageUrl: nullableTrimmedString(2048),
  desktopImageStoragePath: nullableTrimmedString(1024),
  tabletImageUrl: nullableTrimmedString(2048),
  tabletImageStoragePath: nullableTrimmedString(1024),
  mobileImageUrl: nullableTrimmedString(2048),
  mobileImageStoragePath: nullableTrimmedString(1024),
  imageAlt: nullableTrimmedString(200),
  backgroundColor: hexColorSchema.nullable().optional(),
  textColor: hexColorSchema.nullable().optional(),
  overlayOpacity: z.coerce.number().min(0).max(1).optional(),
  ctaText: nullableTrimmedString(80),
  destinationType: z.nativeEnum(HeroBannerDestinationType).optional(),
  categoryId: nullableCategoryId,
  productId: nullableUuid,
  storeId: nullableUuid,
  promotionId: nullableUuid,
  searchQuery: nullableTrimmedString(120),
  customUrl: z
    .preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
      internalCustomUrlSchema.nullable(),
    )
    .optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  status: z.nativeEnum(HeroBannerStatus).optional(),
  autoplay: z.boolean().optional(),
  autoplayDelay: z.coerce.number().int().min(1000).max(60000).nullable().optional(),
  openInNewTab: z.boolean().optional(),
  publishStartAt: isoDateTimeSchema.optional(),
  publishEndAt: isoDateTimeSchema.nullable().optional(),
})

type HeroBannerValidationShape = z.infer<typeof heroBannerBaseSchema>

function isBlank(value: string | null | undefined) {
  return value == null || value.trim() === ''
}

function applyHeroBannerRules(input: HeroBannerValidationShape, ctx: z.RefinementCtx) {
  if (input.publishStartAt && input.publishEndAt) {
    const publishStartAt = new Date(input.publishStartAt)
    const publishEndAt = new Date(input.publishEndAt)
    if (publishEndAt <= publishStartAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['publishEndAt'],
        message: 'Publish end date must be later than publish start date',
      })
    }
  }

  if (input.autoplay === false && input.autoplayDelay != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['autoplayDelay'],
      message: 'Autoplay delay must be empty when autoplay is disabled',
    })
  }

  const destinationType = input.destinationType ?? HeroBannerDestinationType.NONE
  const targetFields = [
    input.categoryId,
    input.productId,
    input.storeId,
    input.promotionId,
    input.searchQuery,
    input.customUrl,
  ].filter((value) => !isBlank(value))

  if (destinationType === HeroBannerDestinationType.NONE) {
    if (targetFields.length > 0 || !isBlank(input.ctaText) || input.openInNewTab === true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['destinationType'],
        message: 'Empty destinations cannot include CTA or target fields',
      })
    }
  } else if (isBlank(input.ctaText)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ctaText'],
      message: 'CTA text is required when a destination is configured',
    })
  }

  const requiredTargetByType: Record<HeroBannerDestinationType, string | null | undefined> = {
    [HeroBannerDestinationType.NONE]: null,
    [HeroBannerDestinationType.CATEGORY]: input.categoryId,
    [HeroBannerDestinationType.PRODUCT]: input.productId,
    [HeroBannerDestinationType.STORE]: input.storeId,
    [HeroBannerDestinationType.PROMOTION]: input.promotionId,
    [HeroBannerDestinationType.SEARCH]: input.searchQuery,
    [HeroBannerDestinationType.CUSTOM_URL]: input.customUrl,
  }

  if (destinationType !== HeroBannerDestinationType.NONE) {
    if (isBlank(requiredTargetByType[destinationType])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['destinationType'],
        message: 'Destination target is required for the selected destination type',
      })
    }

    if (targetFields.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['destinationType'],
        message: 'Hero banner must include exactly one destination target',
      })
    }
  }

  if (
    input.status === HeroBannerStatus.PUBLISHED &&
    (isBlank(input.title) || isBlank(input.desktopImageUrl) || isBlank(input.imageAlt))
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['status'],
      message: 'Published hero banners require title, desktop image, and image alt text',
    })
  }
}

export const createHeroBannerSchema = heroBannerBaseSchema.superRefine(applyHeroBannerRules)

export const updateHeroBannerSchema = heroBannerBaseSchema.partial().superRefine((input, ctx) => {
  if (Object.keys(input).length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one hero banner field must be provided',
    })
  }

  if (input.publishStartAt && input.publishEndAt) {
    const publishStartAt = new Date(input.publishStartAt)
    const publishEndAt = new Date(input.publishEndAt)
    if (publishEndAt <= publishStartAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['publishEndAt'],
        message: 'Publish end date must be later than publish start date',
      })
    }
  }

  if (input.autoplay === false && input.autoplayDelay != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['autoplayDelay'],
      message: 'Autoplay delay must be empty when autoplay is disabled',
    })
  }
})

export const heroBannerQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(HeroBannerStatus).optional(),
  destinationType: z.nativeEnum(HeroBannerDestinationType).optional(),
})

export const publicHeroBannerQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(5),
})

export const reorderHeroBannersSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        sortOrder: z.coerce.number().int().min(0),
      }),
    )
    .min(1, 'At least one hero banner must be provided'),
})
