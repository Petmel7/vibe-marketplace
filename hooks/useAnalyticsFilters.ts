'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  buildAnalyticsSearchParams,
  normalizeAnalyticsUrlState,
  type AnalyticsInterval,
  type AnalyticsRange,
  type AnalyticsUrlState,
} from '@/types/analytics'

export function useAnalyticsFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [draft, setDraft] = useState<AnalyticsUrlState>(() =>
    normalizeAnalyticsUrlState(Object.fromEntries(searchParams.entries())),
  )

  useEffect(() => {
    setDraft(normalizeAnalyticsUrlState(Object.fromEntries(searchParams.entries())))
  }, [searchParams])

  const updateDraft = useCallback(
    (patch: Partial<AnalyticsUrlState>) => {
      setDraft((current) => {
        const next = { ...current, ...patch }

        if (patch.range && patch.range !== 'custom') {
          next.from = ''
          next.to = ''
        }

        return next
      })
    },
    [],
  )

  const apply = useCallback(() => {
    const params = buildAnalyticsSearchParams(draft)
    const query = params.toString()
    const nextUrl = query ? `${pathname}?${query}` : pathname

    startTransition(() => {
      router.push(nextUrl, { scroll: false })
    })
  }, [draft, pathname, router])

  const reset = useCallback(() => {
    const nextState: AnalyticsUrlState = {
      range: '30d',
      interval: 'day',
      from: '',
      to: '',
    }

    setDraft(nextState)
    startTransition(() => {
      router.push(pathname, { scroll: false })
    })
  }, [pathname, router])

  return {
    draft,
    isPending,
    setRange: (range: AnalyticsRange) => updateDraft({ range }),
    setInterval: (interval: AnalyticsInterval) => updateDraft({ interval }),
    setFrom: (from: string) => updateDraft({ from }),
    setTo: (to: string) => updateDraft({ to }),
    apply,
    reset,
  }
}
