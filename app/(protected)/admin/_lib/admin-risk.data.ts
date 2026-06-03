import { z } from 'zod'
import {
  getAdminStoreRiskProfileById,
  getAdminStoreRiskProfiles,
  getAdminUserRiskProfileById,
  getAdminUserRiskProfiles,
} from '@/features/risk/risk.service'
import { riskProfileQuerySchema } from '@/features/risk/risk.schema'
import { RiskSubjectNotFoundError } from '@/lib/errors/risk'
import type { SessionUser } from '@/types/auth'
import type { RiskProfileDetail, RiskSignalType } from '@/types/risk'

type RawSearchParams = Record<string, string | string[] | undefined>

const riskDetailFiltersSchema = z.object({
  signalType: z.string().trim().min(1).optional(),
  dateFrom: z.string().trim().min(1).optional(),
  dateTo: z.string().trim().min(1).optional(),
})

function normalizeSearchParams(searchParams: RawSearchParams) {
  return Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  )
}

export function parseRiskListFilters(searchParams: RawSearchParams) {
  const parsed = riskProfileQuerySchema.safeParse(normalizeSearchParams(searchParams))
  return parsed.success ? parsed.data : riskProfileQuerySchema.parse({})
}

export function parseRiskDetailFilters(searchParams: RawSearchParams) {
  const parsed = riskDetailFiltersSchema.safeParse(normalizeSearchParams(searchParams))
  return parsed.success ? parsed.data : riskDetailFiltersSchema.parse({})
}

export function filterRiskSignals(
  profile: RiskProfileDetail,
  filters: ReturnType<typeof parseRiskDetailFilters>,
) {
  const dateFrom = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00.000Z`) : null
  const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999Z`) : null

  return profile.signals.filter((signal) => {
    if (filters.signalType && signal.signalType !== (filters.signalType as RiskSignalType)) {
      return false
    }

    const createdAt = new Date(signal.createdAt)
    if (dateFrom && createdAt < dateFrom) {
      return false
    }

    if (dateTo && createdAt > dateTo) {
      return false
    }

    return true
  })
}

export async function getAdminUserRiskPageData(user: SessionUser, searchParams: RawSearchParams) {
  const filters = parseRiskListFilters(searchParams)
  const data = await getAdminUserRiskProfiles(user, filters)

  return {
    filters,
    ...data,
  }
}

export async function getAdminStoreRiskPageData(user: SessionUser, searchParams: RawSearchParams) {
  const filters = parseRiskListFilters(searchParams)
  const data = await getAdminStoreRiskProfiles(user, filters)

  return {
    filters,
    ...data,
  }
}

export async function getAdminRiskOverviewData(user: SessionUser) {
  const [criticalUsers, criticalStores, recentUsers, recentStores] = await Promise.all([
    getAdminUserRiskProfiles(user, { page: 1, limit: 5, level: 'CRITICAL' }),
    getAdminStoreRiskProfiles(user, { page: 1, limit: 5, level: 'CRITICAL' }),
    getAdminUserRiskProfiles(user, { page: 1, limit: 5 }),
    getAdminStoreRiskProfiles(user, { page: 1, limit: 5 }),
  ])

  return {
    criticalUsers,
    criticalStores,
    recentUsers,
    recentStores,
  }
}

export async function getAdminUserRiskDetailPageData(user: SessionUser, id: string) {
  try {
    return await getAdminUserRiskProfileById(user, id)
  } catch (error) {
    if (error instanceof RiskSubjectNotFoundError) {
      return null
    }

    throw error
  }
}

export async function getAdminStoreRiskDetailPageData(user: SessionUser, id: string) {
  try {
    return await getAdminStoreRiskProfileById(user, id)
  } catch (error) {
    if (error instanceof RiskSubjectNotFoundError) {
      return null
    }

    throw error
  }
}
