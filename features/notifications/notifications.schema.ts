import { NotificationType } from '@/app/generated/prisma/client'
import { z } from 'zod'

export const notificationTypeSchema = z.nativeEnum(NotificationType)

export const notificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unread: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional(),
})

export const notificationIdParamSchema = z.object({
  id: z.string().uuid(),
})
