import { z } from 'zod'

export const updateProfileSchema = z.object({
  displayName: z.string().max(100).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  phoneNumber: z.string().max(30).nullable().optional(),
})
