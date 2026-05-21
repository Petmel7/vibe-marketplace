'use client'

import { useEffect, useState } from 'react'
import type { SellerCategoryOptionDto } from '@/features/seller/products/seller-product.dto'

export function useSellerCategories() {
  const [categories, setCategories] = useState<SellerCategoryOptionDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    async function loadCategories() {
      setIsLoading(true)

      try {
        const response = await fetch('/api/seller/products/categories')
        const json = (await response.json()) as
          | { success: true; data: SellerCategoryOptionDto[] }
          | { success: false; error?: { message?: string } }

        if (ignore) {
          return
        }

        if (!response.ok || !json.success) {
          setErrorMessage(json.success ? 'Unable to load categories.' : json.error?.message ?? 'Unable to load categories.')
          setCategories([])
          return
        }

        setCategories(json.data)
        setErrorMessage(null)
      } catch {
        if (ignore) {
          return
        }

        setErrorMessage('Unable to load categories.')
        setCategories([])
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
