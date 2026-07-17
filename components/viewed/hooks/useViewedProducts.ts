
'use client'

import {
  useEffect,
  useState,
} from 'react'

import type { ViewedProductDto }
  from '@/features/viewed/viewed.dto'

import { fetchViewedProducts }
  from '../api/viewed.api'
import { subscribeToViewedProductsUpdated }
  from '../api/viewed.api'

interface UseViewedProductsResult {
  items: ViewedProductDto[]
  isLoading: boolean
}

export function useViewedProducts(
  currentProductId?: string,
): UseViewedProductsResult {
  const [items, setItems] = useState<
    ViewedProductDto[]
  >([])

  const [isLoading, setIsLoading] =
    useState(true)
  const [refreshKey, setRefreshKey] =
    useState(0)

  useEffect(() => {
    return subscribeToViewedProductsUpdated(() => {
      setRefreshKey((current) => current + 1)
    })
  }, [])

  useEffect(() => {
    const controller =
      new AbortController()

    async function loadViewedProducts() {
      try {
        const json =
          await fetchViewedProducts(
            controller.signal,
          )

        if (controller.signal.aborted) {
          return
        }

        if (!json.items) {
          setItems([])

          return
        }

        const filtered = json.items
          .filter(
            (item) =>
              !currentProductId ||
              item.productId !==
                currentProductId,
          )
          .slice(0, 10)

        setItems(filtered)
      } catch {
        if (!controller.signal.aborted) {
          setItems([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    setIsLoading(true)

    loadViewedProducts()

    return () => controller.abort()
  }, [currentProductId, refreshKey])

  return {
    items,
    isLoading,
  }
}
