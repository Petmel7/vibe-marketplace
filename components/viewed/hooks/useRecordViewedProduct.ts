
'use client'

import { useEffect } from 'react'

import { recordViewedProduct }
  from '../api/viewed.api'

const recordedProductIds = new Set<string>()
const inFlightProductIds = new Set<string>()
const SESSION_STORAGE_PREFIX =
  'viewed:recorded:'

function getSessionStorageKey(
  productId: string,
) {
  return `${SESSION_STORAGE_PREFIX}${productId}`
}

function hasRecordedProductInSession(
  productId: string,
) {
  if (typeof window === 'undefined') {
    return false
  }

  return window.sessionStorage.getItem(
    getSessionStorageKey(productId),
  ) === '1'
}

function markProductRecordedInSession(
  productId: string,
) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(
    getSessionStorageKey(productId),
    '1',
  )
}

export function useRecordViewedProduct(
  productId: string,
) {
  useEffect(() => {
    if (
      recordedProductIds.has(productId) ||
      inFlightProductIds.has(productId) ||
      hasRecordedProductInSession(productId)
    ) {
      recordedProductIds.add(productId)
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

        recordedProductIds.add(productId)
        markProductRecordedInSession(productId)
      })
      .catch(() => { })
      .finally(() => {
        inFlightProductIds.delete(productId)
      })

    return () => controller.abort()
  }, [productId])
}
