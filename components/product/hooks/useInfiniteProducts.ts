'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProductListItem } from '@/components/product/productListItem'

interface Meta {
  page: number
  limit: number
  total: number
  hasNextPage: boolean
}

interface ApiResponse {
  success: boolean
  data: {
    data: ProductListItem[]
    meta: Meta
  }
}

interface Params {
  type: 'new' | 'hit'
  initialProducts: ProductListItem[]
  initialPage: number
  initialHasNextPage: boolean
}

export function useInfiniteProducts({
  type,
  initialProducts,
  initialPage,
  initialHasNextPage,
}: Params) {
  const [products, setProducts] = useState(initialProducts)
  const [page, setPage] = useState(initialPage)
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage)
  const [isLoading, setIsLoading] = useState(false)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const isLoadingRef = useRef(false)
  const hasNextPageRef = useRef(initialHasNextPage)

  useEffect(() => {
    hasNextPageRef.current = hasNextPage
  }, [hasNextPage])

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasNextPageRef.current) {
      return
    }

    const nextPage = page + 1
    isLoadingRef.current = true
    setIsLoading(true)

    try {
      const response = await fetch(`/api/products/${type}?page=${nextPage}`)
      const json = (await response.json()) as ApiResponse

      if (!response.ok || !json.success) {
        return
      }

      setProducts((current) => [...current, ...json.data.data])
      setPage(json.data.meta.page)
      setHasNextPage(json.data.meta.hasNextPage)
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [page, type])

  const setObserverTarget = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect()

      if (!node || !hasNextPageRef.current) {
        return
      }

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore()
        }
      })

      observerRef.current.observe(node)
    },
    [loadMore],
  )

  return {
    products,
    page,
    hasNextPage,
    isLoading,
    setObserverTarget,
  }
}
