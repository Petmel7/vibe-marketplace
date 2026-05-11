import { z } from 'zod'

export const authCredentialsSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(72, 'Use 72 characters or fewer.'),
  next: z.string().optional(),
})

export type AuthActionState = {
  formError?: string
  fieldErrors?: {
    email?: string[]
    password?: string[]
  }
}
