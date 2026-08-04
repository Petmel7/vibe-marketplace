import { NotificationType } from '@/app/generated/prisma/client'
import {
  optionalQueryBoolean,
  paginationQuerySchema,
} from '@/lib/validation/query'
import { z } from 'zod'

export const notificationTypeSchema = z.nativeEnum(NotificationType)

export const notificationsQuerySchema = paginationQuerySchema().extend({
  unread: optionalQueryBoolean(),
})

export const notificationIdParamSchema = z.object({
  id: z.string().uuid(),
})
