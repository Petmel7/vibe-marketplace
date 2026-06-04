import {
  getSellerRefundRequestById,
  getSellerRefundRequests,
} from '@/features/refunds/refunds.service'
import { sellerRefundListQuerySchema } from '@/features/refunds/refunds.schema'
import {
  RefundRequestNotFoundError,
  RefundRequestOwnershipError,
} from '@/lib/errors/refund'
import type { SessionUser } from '@/types/auth'
import { getSellerLayoutData } from './seller-dashboard.data'

type RawSearchParams = Record<string, string | string[] | undefined>

function normalizeSearchParams(searchParams: RawSearchParams) {
  return Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  )
}

export async function getSellerRefundsPageData(user: SessionUser, searchParams: RawSearchParams) {
  const layout = await getSellerLayoutData(user)
  const parsed = sellerRefundListQuerySchema.safeParse(normalizeSearchParams(searchParams))
  const filters = parsed.success ? parsed.data : sellerRefundListQuerySchema.parse({})

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

  const data = await getSellerRefundRequests(user, filters)

  return {
    ...layout,
    filters,
    ...data,
  }
}

export async function getSellerRefundDetailViewState(user: SessionUser, id: string) {
  const layout = await getSellerLayoutData(user)

  try {
    const refund = await getSellerRefundRequestById(user, id)
    return { kind: 'success' as const, layout, refund }
  } catch (error) {
    if (error instanceof RefundRequestNotFoundError) {
      return { kind: 'not-found' as const, layout }
    }

    if (error instanceof RefundRequestOwnershipError) {
      return { kind: 'forbidden' as const, layout }
    }

    throw error
  }
}
