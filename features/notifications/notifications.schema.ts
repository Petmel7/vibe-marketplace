import { NotificationType } from '@/app/generated/prisma/client'
import {
  defaultedQueryNumber,
  optionalQueryBoolean,
} from '@/lib/validation/query'
import { z } from 'zod'

export const notificationTypeSchema = z.nativeEnum(NotificationType)

export const notificationsQuerySchema = z.object({
  page: defaultedQueryNumber(z.coerce.number().int().min(1), 1),
  limit: defaultedQueryNumber(z.coerce.number().int().min(1).max(100), 20),
  unread: optionalQueryBoolean(),
})

export const notificationIdParamSchema = z.object({
  id: z.string().uuid(),
})
