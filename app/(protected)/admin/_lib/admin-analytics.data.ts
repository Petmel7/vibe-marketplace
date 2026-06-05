import { headers } from 'next/headers'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import {
  buildAnalyticsSearchParams,
  normalizeAnalyticsUrlState,
  type AdminAnalytics,
  type AnalyticsUrlState,
} from '@/types/analytics'
import type { SessionUser } from '@/types/auth'

type RawSearchParams = Record<string, string | string[] | undefined>

async function getRequestOrigin() {
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')

  if (!host) {
    return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  }

  const protocol =
    headerStore.get('x-forwarded-proto') ??
    (host.includes('localhost') ? 'http' : 'https')

  return `${protocol}://${host}`
}

async function fetchAdminAnalytics(filters: AnalyticsUrlState): Promise<AdminAnalytics> {
  const headerStore = await headers()
  const origin = await getRequestOrigin()
  const params = buildAnalyticsSearchParams(filters)
  const requestUrl = `${origin}${API_ROUTES.adminAnalytics}${params.size > 0 ? `?${params.toString()}` : ''}`

  const response = await fetch(requestUrl, {
    cache: 'no-store',
    headers: headerStore.get('cookie')
      ? {
          cookie: headerStore.get('cookie')!,
        }
      : undefined,
  })

  const payload = (await response.json()) as
    | { success: true; data: AdminAnalytics }
    | { success: false; error?: { message?: string } }

  if (!response.ok || !payload.success) {
    throw new Error(
      payload.success === false
        ? payload.error?.message ?? 'Не вдалося завантажити аналітику маркетплейсу.'
        : 'Не вдалося завантажити аналітику маркетплейсу.',
    )
  }

  return payload.data
}

export async function getAdminAnalyticsViewData(
  _user: SessionUser,
  searchParams: RawSearchParams,
) {
  const filters = normalizeAnalyticsUrlState(searchParams)

  try {
    const analytics = await fetchAdminAnalytics(filters)

    return {
      status: 'ready' as const,
      filters,
      analytics,
    }
  } catch (error) {
    return {
      status: 'error' as const,
      filters,
      analytics: null,
      errorMessage:
        error instanceof Error ? error.message : 'Не вдалося завантажити аналітику маркетплейсу.',
    }
  }
}
