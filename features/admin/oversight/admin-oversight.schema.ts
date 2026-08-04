import { optionalQueryString, paginationQuerySchema } from '@/lib/validation/query'
import { z } from 'zod'

const paginationSchema = paginationQuerySchema()

export const userOversightFilterSchema = paginationSchema.extend({
  search: optionalQueryString(z.string()),
  role: optionalQueryString(z.string()),
})

export const orderOversightFilterSchema = paginationSchema.extend({
  status: optionalQueryString(z.string()),
  dateFrom: optionalQueryString(z.string()),
  dateTo: optionalQueryString(z.string()),
})

export const sellerOversightFilterSchema = paginationSchema.extend({
  status: optionalQueryString(z.string()),
})

export const productOversightFilterSchema = paginationSchema.extend({
  status: optionalQueryString(z.string()),
  search: optionalQueryString(z.string()),
})

export const adminStoreOptionQuerySchema = paginationSchema.extend({
  q: optionalQueryString(z.string().trim().min(1).max(120)),
})
