import { adminDisputeListQuerySchema } from '@/features/disputes/disputes.schema'
import { getAdminDisputeById, getAdminDisputes } from '@/features/disputes/disputes.service'
import { DisputeNotFoundError } from '@/lib/errors/dispute'
import type { SessionUser } from '@/types/auth'

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

export async function getAdminDisputesPageData(user: SessionUser, searchParams: RawSearchParams) {
  const parsed = adminDisputeListQuerySchema.safeParse(normalizeSearchParams(searchParams))
  const filters = parsed.success
    ? parsed.data
    : adminDisputeListQuerySchema.parse({})
  const data = await getAdminDisputes(user, filters)

  return {
    filters,
    ...data,
  }
}

export async function getAdminDisputeDetailPageData(user: SessionUser, id: string) {
  try {
    return await getAdminDisputeById(user, id)
  } catch (error) {
    if (error instanceof DisputeNotFoundError) {
      return null
    }

    throw error
  }
}
