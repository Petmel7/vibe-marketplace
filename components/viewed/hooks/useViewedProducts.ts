'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/store/cartStore'
import type { ViewedProductDto } from '@/features/viewed/viewed.dto'

interface UseViewedProductsResult {
  items: ViewedProductDto[]
  isLoading: boolean
}

export function useViewedProducts(currentProductId: string): UseViewedProductsResult {
  const [items, setItems] = useState<ViewedProductDto[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const sessionId = useCartStore.getState().ensureSessionId()
    const controller = new AbortController()

    async function loadViewedProducts() {
      try {
        const response = await fetch('/api/viewed', {
          headers: { 'x-session-id': sessionId },
          signal: controller.signal,
        })
        const json = await response.json()

        if (controller.signal.aborted) return

        if (!response.ok || !json.success) {
          setItems([])
          return
        }

        const filtered = (json.data.items as ViewedProductDto[])
          .filter((item) => item.productId !== currentProductId)
          .slice(0, 10)

        setItems(filtered)
      } catch {
        if (controller.signal.aborted) return
        setItems([])
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    setIsLoading(true)
    loadViewedProducts()

    return () => controller.abort()
  }, [currentProductId])

  return { items, isLoading }
}
