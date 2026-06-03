import { z } from 'zod'
import {
  getSellerFinanceLedger,
  getSellerFinancePayouts,
  getSellerFinanceSummary,
} from '@/features/payouts/payouts.service'
import {
  sellerLedgerQuerySchema,
  sellerPayoutQuerySchema,
} from '@/features/payouts/payouts.schema'
import type { SessionUser } from '@/types/auth'
import { getSellerLayoutData } from './seller-dashboard.data'

type RawSearchParams = Record<string, string | string[] | undefined>

function normalizeSearchParams(searchParams: RawSearchParams) {
  return Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  )
}

function parseWithSchema<T extends z.ZodTypeAny>(schema: T, searchParams: RawSearchParams): z.infer<T> {
  const parsed = schema.safeParse(normalizeSearchParams(searchParams))
  return parsed.success ? parsed.data : schema.parse({})
}

export async function getSellerFinanceSummaryPageData(user: SessionUser, searchParams: RawSearchParams) {
  const layout = await getSellerLayoutData(user)
  const filters = parseWithSchema(z.object({ storeId: z.uuid().optional() }), searchParams)

  if (!layout.store) {
    return {
      ...layout,
      filters,
      summary: {
        currency: 'UAH',
        pendingAmount: '0.00',
        availableAmount: '0.00',
        paidOutAmount: '0.00',
        stores: [],
      },
    }
  }

  const summary = await getSellerFinanceSummary(user, filters)

  return {
    ...layout,
    filters,
    summary,
  }
}

export async function getSellerFinanceLedgerPageData(user: SessionUser, searchParams: RawSearchParams) {
  const layout = await getSellerLayoutData(user)
  const filters = parseWithSchema(sellerLedgerQuerySchema, searchParams)

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

  const data = await getSellerFinanceLedger(user, filters)

  return {
    ...layout,
    filters,
    ...data,
  }
}

export async function getSellerFinancePayoutsPageData(user: SessionUser, searchParams: RawSearchParams) {
  const layout = await getSellerLayoutData(user)
  const filters = parseWithSchema(sellerPayoutQuerySchema, searchParams)

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

  const data = await getSellerFinancePayouts(user, filters)

  return {
    ...layout,
    filters,
    ...data,
  }
}
