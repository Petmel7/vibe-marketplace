import {
  optionalQueryString,
  optionalQueryUuid,
  paginationQuerySchema,
} from '@/lib/validation/query'
import { z } from 'zod'

export const orderFilterSchema = paginationQuerySchema().extend({
  storeId: optionalQueryUuid(),
  status: optionalQueryString(z.string()),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'pending',
    'confirmed',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
  ]),
})
