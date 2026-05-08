import { z } from 'zod'

export const approveSellerSchema = z.object({
  sellerId: z.string().uuid(),
})

export const rejectSellerSchema = z.object({
  sellerId: z.string().uuid(),
  reason: z.string().min(10),
})

export const suspendSellerSchema = z.object({
  sellerId: z.string().uuid(),
  reason: z.string().min(1),
})

export const reactivateSellerSchema = z.object({
  sellerId: z.string().uuid(),
})
