import { z } from 'zod'
import { EmailEventNotFoundError } from '@/lib/errors/email'
import { getAdminEmailById, getAdminEmails } from '@/features/email/email.service'
import { adminEmailQuerySchema } from '@/features/email/email.schema'
import type { SessionUser } from '@/types/auth'

type RawSearchParams = Record<string, string | string[] | undefined>

function normalizeSearchParams(searchParams: RawSearchParams) {
  const entries = Object.entries(searchParams).map(([key, value]) => [
    key,
    Array.isArray(value) ? value[0] : value,
  ])

  return Object.fromEntries(entries)
}

function parseWithSchema<T extends z.ZodTypeAny>(schema: T, searchParams: RawSearchParams): z.infer<T> {
  const parsed = schema.safeParse(normalizeSearchParams(searchParams))
  return parsed.success ? parsed.data : schema.parse({})
}

export async function getAdminEmailsPageData(user: SessionUser, searchParams: RawSearchParams) {
  const filters = parseWithSchema(adminEmailQuerySchema, searchParams)
  const data = await getAdminEmails(user, filters)
  const items = await Promise.all(data.items.map((item) => getAdminEmailById(user, item.id)))

  return {
    filters,
    ...data,
    items,
  }
}

export async function getAdminEmailDetailPageData(user: SessionUser, id: string) {
  try {
    return await getAdminEmailById(user, id)
  } catch (error) {
    if (error instanceof EmailEventNotFoundError) {
      return null
    }

    throw error
  }
}
