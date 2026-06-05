import { headers } from 'next/headers'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import {
  buildAnalyticsSearchParams,
  normalizeAnalyticsUrlState,
  type AnalyticsUrlState,
  type SellerAnalytics,
} from '@/types/analytics'
import type { SessionUser } from '@/types/auth'
import { getSellerLayoutData } from './seller-dashboard.data'

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

async function fetchSellerAnalytics(filters: AnalyticsUrlState): Promise<SellerAnalytics> {
  const headerStore = await headers()
  const origin = await getRequestOrigin()
  const params = buildAnalyticsSearchParams(filters)
  const requestUrl = `${origin}${API_ROUTES.sellerAnalytics}${params.size > 0 ? `?${params.toString()}` : ''}`

  const response = await fetch(requestUrl, {
    cache: 'no-store',
    headers: headerStore.get('cookie')
      ? {
          cookie: headerStore.get('cookie')!,
        }
      : undefined,
  })

  const payload = (await response.json()) as
    | { success: true; data: SellerAnalytics }
    | { success: false; error?: { message?: string } }

  if (!response.ok || !payload.success) {
    throw new Error(
      payload.success === false
        ? payload.error?.message ?? 'Не вдалося завантажити аналітику продавця.'
        : 'Не вдалося завантажити аналітику продавця.',
    )
  }

  return payload.data
}

export async function getSellerAnalyticsViewData(
  user: SessionUser,
  searchParams: RawSearchParams,
) {
  const layout = await getSellerLayoutData(user)
  const filters = normalizeAnalyticsUrlState(searchParams)

  if (!layout.store) {
    return {
      ...layout,
      status: 'empty' as const,
      filters,
      analytics: null,
    }
  }

  try {
    const analytics = await fetchSellerAnalytics(filters)

    return {
      ...layout,
      status: 'ready' as const,
      filters,
      analytics,
    }
  } catch (error) {
    return {
      ...layout,
      status: 'error' as const,
      filters,
      analytics: null,
      errorMessage:
        error instanceof Error ? error.message : 'Не вдалося завантажити аналітику продавця.',
    }
  }
}
