import { z } from 'zod'
import {
  getAdminRefundRequestById,
  getAdminRefundRequests,
} from '@/features/refunds/refunds.service'
import { adminRefundListQuerySchema } from '@/features/refunds/refunds.schema'
import { RefundRequestNotFoundError } from '@/lib/errors/refund'
import type { SessionUser } from '@/types/auth'

type RawSearchParams = Record<string, string | string[] | undefined>

function normalizeSearchParams(searchParams: RawSearchParams) {
  const normalized = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  )

  if (typeof normalized.dateFrom === 'string' && normalized.dateFrom) {
    normalized.dateFrom = new Date(`${normalized.dateFrom}T00:00:00.000Z`).toISOString()
  }

  if (typeof normalized.dateTo === 'string' && normalized.dateTo) {
    normalized.dateTo = new Date(`${normalized.dateTo}T23:59:59.999Z`).toISOString()
  }

  return normalized
}

function parseWithSchema<T extends z.ZodTypeAny>(schema: T, searchParams: RawSearchParams): z.infer<T> {
  const parsed = schema.safeParse(normalizeSearchParams(searchParams))
  return parsed.success ? parsed.data : schema.parse({})
}

export async function getAdminRefundsPageData(user: SessionUser, searchParams: RawSearchParams) {
  const filters = parseWithSchema(adminRefundListQuerySchema, searchParams)
  const data = await getAdminRefundRequests(user, filters)

  return {
    filters,
    ...data,
  }
}

export async function getAdminRefundDetailPageData(user: SessionUser, id: string) {
  try {
    return await getAdminRefundRequestById(user, id)
  } catch (error) {
    if (error instanceof RefundRequestNotFoundError) {
      return null
    }

    throw error
  }
}
