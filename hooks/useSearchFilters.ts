'use client'

import { useCallback, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type SearchFilterKey =
  | 'q'
  | 'category'
  | 'minPrice'
  | 'maxPrice'
  | 'inStock'
  | 'rating'
  | 'badge'
  | 'store'
  | 'sort'
  | 'page'
  | 'limit'

function shouldKeepValue(value: string | null | undefined) {
  return Boolean(value && value.trim())
}

export function useSearchFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const navigateWithParams = useCallback(
    (
      mutate: (params: URLSearchParams) => void,
      options: { scroll?: boolean; replace?: boolean } = {},
    ) => {
      const params = new URLSearchParams(searchParams.toString())
      mutate(params)

      const query = params.toString()
      const nextUrl = query ? `${pathname}?${query}` : pathname

      startTransition(() => {
        if (options.replace) {
          router.replace(nextUrl, { scroll: options.scroll ?? false })
          return
        }

        router.push(nextUrl, { scroll: options.scroll ?? false })
      })
    },
    [pathname, router, searchParams],
  )

  const setFilter = useCallback(
    (key: SearchFilterKey, value: string | null, options?: { resetPage?: boolean }) => {
      navigateWithParams((params) => {
        if (shouldKeepValue(value)) {
          params.set(key, value!.trim())
        } else {
          params.delete(key)
        }

        if (options?.resetPage !== false && key !== 'page') {
          params.delete('page')
        }
      })
    },
    [navigateWithParams],
  )

  const setBooleanFilter = useCallback(
    (key: 'inStock', value: boolean) => {
      navigateWithParams((params) => {
        if (value) {
          params.set(key, 'true')
        } else {
          params.delete(key)
        }

        params.delete('page')
      })
    },
    [navigateWithParams],
  )

  const setFilters = useCallback(
    (updates: Partial<Record<SearchFilterKey, string | null>>) => {
      navigateWithParams((params) => {
        for (const [key, value] of Object.entries(updates) as Array<
          [SearchFilterKey, string | null]
        >) {
          if (shouldKeepValue(value)) {
            params.set(key, value!.trim())
          } else {
            params.delete(key)
          }
        }

        params.delete('page')
      })
    },
    [navigateWithParams],
  )

  const clearFilter = useCallback(
    (key: SearchFilterKey) => {
      navigateWithParams((params) => {
        params.delete(key)

        if (key !== 'page') {
          params.delete('page')
        }
      })
    },
    [navigateWithParams],
  )

  const clearAllFilters = useCallback(() => {
    navigateWithParams((params) => {
      for (const key of [
        'category',
        'minPrice',
        'maxPrice',
        'inStock',
        'rating',
        'badge',
        'store',
        'page',
      ] satisfies SearchFilterKey[]) {
        params.delete(key)
      }
    })
  }, [navigateWithParams])

  const resetSearch = useCallback(() => {
    navigateWithParams((params) => {
      for (const key of [
        'q',
        'category',
        'minPrice',
        'maxPrice',
        'inStock',
        'rating',
        'badge',
        'store',
        'page',
      ] satisfies SearchFilterKey[]) {
        params.delete(key)
      }
    })
  }, [navigateWithParams])

  const goToPage = useCallback(
    (page: number) => {
      navigateWithParams(
        (params) => {
          if (page <= 1) {
            params.delete('page')
          } else {
            params.set('page', String(page))
          }
        },
        { scroll: true },
      )
    },
    [navigateWithParams],
  )

  return {
    isPending,
    setFilter,
    setBooleanFilter,
    setFilters,
    clearFilter,
    clearAllFilters,
    resetSearch,
    goToPage,
  }
}
