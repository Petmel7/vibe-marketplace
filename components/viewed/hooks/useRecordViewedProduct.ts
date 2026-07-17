
'use client'

import { useEffect } from 'react'

import { recordViewedProduct }
  from '../api/viewed.api'

const inFlightProductIds = new Set<string>()
const lastRecordedAtByProductId =
  new Map<string, number>()
const RECORD_DEBOUNCE_WINDOW_MS = 3000

function wasProductRecordedRecently(
  productId: string,
) {
  const lastRecordedAt =
    lastRecordedAtByProductId.get(productId)

  if (!lastRecordedAt) {
    return false
  }

  return (
    Date.now() - lastRecordedAt <
    RECORD_DEBOUNCE_WINDOW_MS
  )
}

export function useRecordViewedProduct(
  productId: string,
) {
  useEffect(() => {
    if (
      inFlightProductIds.has(productId) ||
      wasProductRecordedRecently(productId)
    ) {
      return
    }

    const controller =
      new AbortController()

    inFlightProductIds.add(productId)

    recordViewedProduct(
      productId,
      controller.signal,
    )
      .then(() => {
        if (controller.signal.aborted) {
          return
        }

        lastRecordedAtByProductId.set(
          productId,
          Date.now(),
        )
      })
      .catch(() => { })
      .finally(() => {
        inFlightProductIds.delete(productId)
      })

    return () => controller.abort()
  }, [productId])
}
