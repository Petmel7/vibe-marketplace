'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { API_ROUTES, isAuthPagePath } from '@/lib/constants/apiRoutes'

let visitorInitPromise: Promise<void> | null = null
let visitorInitRetryTimeout: ReturnType<typeof setTimeout> | null = null

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
  const pathname = usePathname()

  useEffect(() => {
    if (isAuthPagePath(pathname)) {
      return
    }

    if (!visitorInitPromise) {
      visitorInitPromise = initVisitor()
        .catch((error) => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[VisitorProvider] visitor init request failed', {
              pathname,
              route: API_ROUTES.visitorInit,
              error: error instanceof Error ? error.message : String(error),
            })
          }

          if (
            process.env.NODE_ENV !== 'production' &&
            error instanceof Error &&
            error.message === 'VISITOR_INIT_FAILED_404' &&
            !visitorInitRetryTimeout
          ) {
            visitorInitRetryTimeout = setTimeout(() => {
              visitorInitRetryTimeout = null
              visitorInitPromise = initVisitor().catch((retryError) => {
                if (process.env.NODE_ENV !== 'production') {
                  console.warn('[VisitorProvider] visitor init retry failed', {
                    pathname,
                    route: API_ROUTES.visitorInit,
                    error: retryError instanceof Error ? retryError.message : String(retryError),
                  })
                }
              }).finally(() => {
                visitorInitPromise = null
              })
            }, 500)
          }
        })
        .finally(() => {
          visitorInitPromise = null
        })
    }
  }, [pathname])

  return null
}
