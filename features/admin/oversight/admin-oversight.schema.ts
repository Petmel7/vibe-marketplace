import { defaultedQueryNumber, optionalQueryString } from '@/lib/validation/query'
import { z } from 'zod'

const pageQuery = defaultedQueryNumber(z.coerce.number().int().min(1), 1)
const limitQuery = defaultedQueryNumber(z.coerce.number().int().min(1).max(100), 20)

export const userOversightFilterSchema = z.object({
  page: pageQuery,
  limit: limitQuery,
  search: optionalQueryString(z.string()),
  role: optionalQueryString(z.string()),
})

export const orderOversightFilterSchema = z.object({
  page: pageQuery,
  limit: limitQuery,
  status: optionalQueryString(z.string()),
  dateFrom: optionalQueryString(z.string()),
  dateTo: optionalQueryString(z.string()),
})

export const sellerOversightFilterSchema = z.object({
  page: pageQuery,
  limit: limitQuery,
  status: optionalQueryString(z.string()),
})

export const productOversightFilterSchema = z.object({
  page: pageQuery,
  limit: limitQuery,
  status: optionalQueryString(z.string()),
  search: optionalQueryString(z.string()),
})

export const adminStoreOptionQuerySchema = z.object({
  page: pageQuery,
  limit: limitQuery,
  q: optionalQueryString(z.string().trim().min(1).max(120)),
})
