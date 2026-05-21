'use client'

import { useEffect } from 'react'
import { API_ROUTES } from '@/lib/constants/apiRoutes'

let visitorInitPromise: Promise<void> | null = null

async function initVisitor() {
  const response = await fetch(API_ROUTES.visitorInit, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`VISITOR_INIT_FAILED_${response.status}`)
  }
}

export function VisitorProvider() {
  useEffect(() => {
    if (!visitorInitPromise) {
      visitorInitPromise = initVisitor()
        .catch((error) => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[VisitorProvider] visitor init request failed', {
              error: error instanceof Error ? error.message : String(error),
            })
          }
        })
        .finally(() => {
          visitorInitPromise = null
        })
    }
  }, [])

  return null
}
