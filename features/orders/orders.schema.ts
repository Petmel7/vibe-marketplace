import {
  defaultedQueryNumber,
  optionalQueryString,
  optionalQueryUuid,
} from '@/lib/validation/query'
import { z } from 'zod'

export const orderFilterSchema = z.object({
  storeId: optionalQueryUuid(),
  status: optionalQueryString(z.string()),
  page: defaultedQueryNumber(z.coerce.number().int().min(1), 1),
  limit: defaultedQueryNumber(z.coerce.number().int().min(1).max(100), 20),
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
