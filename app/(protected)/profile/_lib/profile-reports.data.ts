import { getMyReports } from '@/features/abuse-reports/abuse-reports.service'
import { myReportsQuerySchema } from '@/features/abuse-reports/abuse-reports.schema'
import type { SessionUser } from '@/types/auth'

type RawSearchParams = Record<string, string | string[] | undefined>

function normalizeSearchParams(searchParams: RawSearchParams) {
  const entries = Object.entries(searchParams).map(([key, value]) => [
    key,
    Array.isArray(value) ? value[0] : value,
  ])

  return Object.fromEntries(entries)
}

export async function getProfileReportsPageData(
  user: SessionUser,
  searchParams: RawSearchParams,
) {
  const parsed = myReportsQuerySchema.safeParse(normalizeSearchParams(searchParams))
  const filters = parsed.success ? parsed.data : myReportsQuerySchema.parse({})
  const data = await getMyReports(user, filters)

  return {
    filters,
    ...data,
  }
}
