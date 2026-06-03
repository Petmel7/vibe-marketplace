import { z } from 'zod'
import {
  getAdminPayoutById,
  getAdminPayouts,
  getAdminSellerBalances,
} from '@/features/payouts/payouts.service'
import {
  adminPayoutQuerySchema,
  adminSellerBalanceQuerySchema,
} from '@/features/payouts/payouts.schema'
import { PayoutNotFoundError } from '@/lib/errors/payout'
import type { SessionUser } from '@/types/auth'

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

export async function getAdminPayoutsPageData(user: SessionUser, searchParams: RawSearchParams) {
  const filters = parseWithSchema(adminPayoutQuerySchema, searchParams)
  const data = await getAdminPayouts(user, filters)

  return {
    filters,
    ...data,
  }
}

export async function getAdminPayoutDetailPageData(user: SessionUser, id: string) {
  try {
    return await getAdminPayoutById(user, id)
  } catch (error) {
    if (error instanceof PayoutNotFoundError) {
      return null
    }

    throw error
  }
}

export async function getAdminSellerBalancesPageData(user: SessionUser, searchParams: RawSearchParams) {
  const filters = parseWithSchema(adminSellerBalanceQuerySchema, searchParams)
  const data = await getAdminSellerBalances(user, filters)

  return {
    filters,
    ...data,
  }
}
