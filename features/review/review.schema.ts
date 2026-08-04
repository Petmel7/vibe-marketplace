import { ReviewStatus } from '@/app/generated/prisma/client'
import {
  optionalQueryParam,
  optionalQueryUuid,
  paginationQuerySchema,
} from '@/lib/validation/query'
import { z } from 'zod'

const reviewTextField = z.string().trim().min(1).max(2000)
const reviewOptionalTextField = z.string().trim().min(1).max(2000).nullable().optional()

export const reviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1).max(200).optional(),
  comment: reviewOptionalTextField,
  pros: reviewOptionalTextField,
  cons: reviewOptionalTextField,
})

export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>

export const reviewUpdateSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    title: z.string().trim().min(1).max(200).nullable().optional(),
    comment: reviewOptionalTextField,
    pros: reviewOptionalTextField,
    cons: reviewOptionalTextField,
  })
  .refine(
    (value) =>
      value.rating !== undefined ||
      value.title !== undefined ||
      value.comment !== undefined ||
      value.pros !== undefined ||
      value.cons !== undefined,
    {
      message: 'At least one review field must be provided',
    },
  )

export type ReviewUpdateInput = z.infer<typeof reviewUpdateSchema>

export const reviewListQuerySchema = paginationQuerySchema()

export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>
export type MyReviewListQuery = ReviewListQuery

export const reviewIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const sellerReplySchema = z.object({
  sellerReply: reviewTextField.max(3000),
})

export type SellerReplyInput = z.infer<typeof sellerReplySchema>

export const adminReviewListQuerySchema = paginationQuerySchema().extend({
  status: optionalQueryParam(z.nativeEnum(ReviewStatus)),
  productId: optionalQueryUuid(),
  userId: optionalQueryUuid(),
})

export type AdminReviewListQuery = z.infer<typeof adminReviewListQuerySchema>

export const reviewModerationSchema = z.object({
  action: z.enum(['approve', 'reject', 'hide', 'restore']),
  moderationReason: z.string().trim().min(1).max(2000).optional(),
})

export type ReviewModerationInput = z.infer<typeof reviewModerationSchema>
