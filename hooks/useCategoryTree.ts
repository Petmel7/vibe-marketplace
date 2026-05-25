'use client'

import { useEffect, useState } from 'react'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import type { CategoryTreeNode } from '@/types/categories'

type ApiSuccess<T> = { success: true; data: T }
type ApiError = { success: false; error?: { message?: string } }

export function useCategoryTree() {
  const [categories, setCategories] = useState<CategoryTreeNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    async function loadCategories() {
      setIsLoading(true)

      try {
        const response = await fetch(API_ROUTES.categoriesTree, {
          method: 'GET',
          cache: 'no-store',
        })
        const json = (await response.json()) as ApiSuccess<CategoryTreeNode[]> | ApiError

        if (ignore) {
          return
        }

        if (!response.ok || !json.success) {
          setCategories([])
          setErrorMessage(
            json.success ? 'Unable to load categories.' : json.error?.message ?? 'Unable to load categories.',
          )
          return
        }

        setCategories(json.data)
        setErrorMessage(null)
      } catch {
        if (ignore) {
          return
        }

        setCategories([])
        setErrorMessage('Unable to load categories.')
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    void loadCategories()

    return () => {
      ignore = true
    }
  }, [])

  return {
    categories,
    isLoading,
    errorMessage,
  }
}
