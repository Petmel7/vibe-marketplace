import { z } from 'zod'

export const sellerOnboardingSchema = z.object({
  businessName: z.string().min(1).max(200),
  taxId: z.string().max(50).nullable().optional(),
})
