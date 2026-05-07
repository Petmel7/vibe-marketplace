import { z } from 'zod'

export const createAddressSchema = z.object({
  label: z.string().max(50).nullable().optional(),
  fullName: z.string().min(1).max(100),
  phone: z.string().min(1).max(30),
  country: z.string().min(1).max(60),
  city: z.string().min(1).max(100),
  region: z.string().max(100).nullable().optional(),
  street: z.string().min(1).max(200),
  building: z.string().min(1).max(20),
  apartment: z.string().max(20).nullable().optional(),
  zipCode: z.string().max(20).nullable().optional(),
  isDefault: z.boolean().optional(),
})

export const updateAddressSchema = createAddressSchema.partial()
