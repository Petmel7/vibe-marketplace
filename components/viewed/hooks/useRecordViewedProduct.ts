'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'

export function useRecordViewedProduct(productId: string) {
  useEffect(() => {
    const sessionId = useCartStore.getState().ensureSessionId()
    const controller = new AbortController()

    fetch('/api/viewed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
      body: JSON.stringify({ productId }),
      signal: controller.signal,
    }).catch(() => {})

    return () => controller.abort()
  }, [productId])
}
