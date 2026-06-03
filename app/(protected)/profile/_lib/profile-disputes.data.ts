import { disputeListQuerySchema } from '@/features/disputes/disputes.schema'
import { getDisputeById, getDisputes } from '@/features/disputes/disputes.service'
import { DisputeNotFoundError, DisputeOwnershipError } from '@/lib/errors/dispute'
import type { SessionUser } from '@/types/auth'

type RawSearchParams = Record<string, string | string[] | undefined>

function normalizeSearchParams(searchParams: RawSearchParams) {
  const entries = Object.entries(searchParams).map(([key, value]) => [
    key,
    Array.isArray(value) ? value[0] : value,
  ])

  return Object.fromEntries(entries)
}

export async function getProfileDisputesPageData(user: SessionUser, searchParams: RawSearchParams) {
  const parsed = disputeListQuerySchema.safeParse(normalizeSearchParams(searchParams))
  const filters = parsed.success
    ? parsed.data
    : disputeListQuerySchema.parse({})

  const data = await getDisputes(user, {
    ...filters,
    scope: 'buyer',
  })

  return {
    filters,
    ...data,
  }
}

export async function getProfileDisputeDetailViewState(user: SessionUser, id: string) {
  try {
    const dispute = await getDisputeById(user, id)
    return { kind: 'success' as const, dispute }
  } catch (error) {
    if (error instanceof DisputeNotFoundError) {
      return { kind: 'not-found' as const }
    }

    if (error instanceof DisputeOwnershipError) {
      return { kind: 'forbidden' as const }
    }

    throw error
  }
}
