import { z } from 'zod'
import { AbuseReportNotFoundError } from '@/lib/errors/abuse-report'
import type { SessionUser } from '@/types/auth'
import {
  getAdminReportById,
  getAdminReports,
} from '@/features/abuse-reports/abuse-reports.service'
import { adminReportsQuerySchema } from '@/features/abuse-reports/abuse-reports.schema'

type RawSearchParams = Record<string, string | string[] | undefined>

function normalizeSearchParams(searchParams: RawSearchParams) {
  const entries = Object.entries(searchParams).map(([key, value]) => [
    key,
    Array.isArray(value) ? value[0] : value,
  ])

  const normalized = Object.fromEntries(entries)

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

export async function getAdminReportsPageData(user: SessionUser, searchParams: RawSearchParams) {
  const filters = parseWithSchema(adminReportsQuerySchema, searchParams)
  const data = await getAdminReports(user, filters)

  return {
    filters,
    ...data,
  }
}

export async function getAdminReportDetailPageData(user: SessionUser, id: string) {
  try {
    return await getAdminReportById(user, id)
  } catch (error) {
    if (error instanceof AbuseReportNotFoundError) {
      return null
    }

    throw error
  }
}
