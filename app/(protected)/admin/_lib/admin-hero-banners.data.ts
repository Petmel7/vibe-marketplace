import { z } from 'zod'
import { heroBannerQuerySchema } from '@/features/hero/hero.schema'
import {
  getAdminHeroBanner,
  getAdminHeroBanners,
} from '@/features/hero/hero.service'
import { HeroBannerNotFoundError } from '@/lib/errors/hero'
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

export async function getAdminHeroBannersPageData(user: SessionUser, searchParams: RawSearchParams) {
  const filters = parseWithSchema(heroBannerQuerySchema, searchParams)
  const data = await getAdminHeroBanners(user, filters)

  return {
    filters,
    ...data,
  }
}

export async function getAdminHeroBannerDetailPageData(user: SessionUser, id: string) {
  try {
    return await getAdminHeroBanner(user, id)
  } catch (error) {
    if (error instanceof HeroBannerNotFoundError) {
      return null
    }

    throw error
  }
}
