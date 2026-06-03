import { z } from 'zod'
import {
  getAdminPromotionById,
  getAdminPromotions,
} from '@/features/promotions/promotions.service'
import {
  promotionQuerySchema,
} from '@/features/promotions/promotions.schema'
import { PromotionNotFoundError } from '@/lib/errors/promotion'
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

export async function getAdminPromotionsPageData(user: SessionUser, searchParams: RawSearchParams) {
  const filters = parseWithSchema(promotionQuerySchema, searchParams)
  const data = await getAdminPromotions(user, filters)

  return {
    filters,
    ...data,
  }
}

export async function getAdminPromotionDetailPageData(user: SessionUser, id: string) {
  try {
    return await getAdminPromotionById(user, id)
  } catch (error) {
    if (error instanceof PromotionNotFoundError) {
      return null
    }

    throw error
  }
}
