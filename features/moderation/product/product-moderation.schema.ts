import { z } from 'zod'

export const approveProductSchema = z.object({
  productId: z.string().uuid(),
})

export const rejectProductSchema = z.object({
  productId: z.string().uuid(),
  reason: z.string().min(1),
})

export const archiveProductSchema = z.object({
  productId: z.string().uuid(),
  reason: z.string().optional(),
})

export const restoreProductSchema = z.object({
  productId: z.string().uuid(),
})
