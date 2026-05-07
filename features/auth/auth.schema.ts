import { z } from 'zod'

// POST /api/auth/sync — no body required (uses Bearer token), schema kept for
// forward-compatibility if request body fields are added later.
export const syncUserSchema = z.object({}).optional()
