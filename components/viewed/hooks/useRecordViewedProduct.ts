
'use client'

import { useEffect } from 'react'

export function useRecordViewedProduct(
  productId: string,
) {
  useEffect(() => {
    const controller =
      new AbortController()

    fetch('/api/viewed', {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify({
        productId,
      }),
      signal: controller.signal,
    }).catch(() => { })

    return () => controller.abort()
  }, [productId])
}