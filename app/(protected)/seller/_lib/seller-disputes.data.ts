import { disputeListQuerySchema } from '@/features/disputes/disputes.schema'
import { getDisputeById, getDisputes } from '@/features/disputes/disputes.service'
import { DisputeNotFoundError, DisputeOwnershipError } from '@/lib/errors/dispute'
import type { SessionUser } from '@/types/auth'
import { getSellerLayoutData } from './seller-dashboard.data'

type RawSearchParams = Record<string, string | string[] | undefined>

function normalizeSearchParams(searchParams: RawSearchParams) {
  const entries = Object.entries(searchParams).map(([key, value]) => [
    key,
    Array.isArray(value) ? value[0] : value,
  ])

  return Object.fromEntries(entries)
}

export async function getSellerDisputesPageData(user: SessionUser, searchParams: RawSearchParams) {
  const layout = await getSellerLayoutData(user)
  const parsed = disputeListQuerySchema.safeParse(normalizeSearchParams(searchParams))
  const filters = parsed.success
    ? parsed.data
    : disputeListQuerySchema.parse({})

  if (!layout.store) {
    return {
      ...layout,
      filters,
      items: [],
      page: filters.page,
      limit: filters.limit,
      total: 0,
    }
  }

  const data = await getDisputes(user, {
    ...filters,
    scope: 'seller',
  })

  return {
    ...layout,
    filters,
    ...data,
  }
}

export async function getSellerDisputeDetailViewState(user: SessionUser, id: string) {
  const layout = await getSellerLayoutData(user)

  try {
    const dispute = await getDisputeById(user, id)
    return { kind: 'success' as const, layout, dispute }
  } catch (error) {
    if (error instanceof DisputeNotFoundError) {
      return { kind: 'not-found' as const, layout }
    }

    if (error instanceof DisputeOwnershipError) {
      return { kind: 'forbidden' as const, layout }
    }

    throw error
  }
}
