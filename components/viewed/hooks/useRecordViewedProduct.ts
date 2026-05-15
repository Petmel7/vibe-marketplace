
'use client'

import { useEffect } from 'react'

import { recordViewedProduct }
  from '../api/viewed.api'

export function useRecordViewedProduct(
  productId: string,
) {
  useEffect(() => {
    const controller =
      new AbortController()

    recordViewedProduct(
      productId,
      controller.signal,
    ).catch(() => { })

    return () => controller.abort()
  }, [productId])
}