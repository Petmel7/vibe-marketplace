'use client'

import { useCallback, useEffect, useState } from 'react'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import type { AdminCategoryTreeNode } from '@/types/categories'

type ApiSuccess<T> = { success: true; data: T }
type ApiError = { success: false; error?: { message?: string } }

export function useAdminCategories() {
  const [categories, setCategories] = useState<AdminCategoryTreeNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const reloadCategories = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch(API_ROUTES.adminCategories, {
        method: 'GET',
        cache: 'no-store',
      })
      const json = (await response.json()) as ApiSuccess<AdminCategoryTreeNode[]> | ApiError

      if (!response.ok || !json.success) {
        setCategories([])
        setErrorMessage(
          json.success
            ? 'We could not load category taxonomy right now.'
            : json.error?.message ?? 'We could not load category taxonomy right now.',
        )
        return
      }

      setCategories(json.data)
    } catch {
      setCategories([])
      setErrorMessage('We could not load category taxonomy right now.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void reloadCategories()
  }, [reloadCategories])

  return {
    categories,
    setCategories,
    isLoading,
    errorMessage,
    reloadCategories,
  }
}
