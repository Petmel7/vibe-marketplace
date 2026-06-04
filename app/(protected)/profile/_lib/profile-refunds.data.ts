import {
  getMyRefundRequestById,
  getMyRefundRequests,
} from '@/features/refunds/refunds.service'
import { refundListQuerySchema } from '@/features/refunds/refunds.schema'
import {
  RefundRequestNotFoundError,
  RefundRequestOwnershipError,
} from '@/lib/errors/refund'
import type { SessionUser } from '@/types/auth'

type RawSearchParams = Record<string, string | string[] | undefined>

function normalizeSearchParams(searchParams: RawSearchParams) {
  return Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  )
}

export async function getProfileRefundsPageData(user: SessionUser, searchParams: RawSearchParams) {
  const parsed = refundListQuerySchema.safeParse(normalizeSearchParams(searchParams))
  const filters = parsed.success ? parsed.data : refundListQuerySchema.parse({})
  const data = await getMyRefundRequests(user, filters)

  return {
    filters,
    ...data,
  }
}

export async function getProfileRefundDetailViewState(user: SessionUser, id: string) {
  try {
    const refund = await getMyRefundRequestById(user, id)
    return { kind: 'success' as const, refund }
  } catch (error) {
    if (error instanceof RefundRequestNotFoundError) {
      return { kind: 'not-found' as const }
    }

    if (error instanceof RefundRequestOwnershipError) {
      return { kind: 'forbidden' as const }
    }

    throw error
  }
}
