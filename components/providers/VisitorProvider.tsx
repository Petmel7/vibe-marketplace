'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { API_ROUTES, isAuthPagePath } from '@/lib/constants/apiRoutes'

let visitorInitPromise: Promise<void> | null = null
let visitorInitRetryTimeout: ReturnType<typeof setTimeout> | null = null
let hasInitializedVisitor = false

class VisitorInitError extends Error {
  status: number

  constructor(status: number) {
    super(`VISITOR_INIT_FAILED_${status}`)
    this.name = 'VisitorInitError'
    this.status = status
  }
}

async function initVisitor() {
  const response = await fetch(API_ROUTES.visitorInit, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new VisitorInitError(response.status)
  }
}

export function VisitorProvider() {
  const pathname = usePathname()
  const isAuthPage = isAuthPagePath(pathname)
  const pathnameRef = useRef(pathname)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (isAuthPage) {
      return
    }

    if (hasInitializedVisitor || visitorInitPromise) {
      return
    }

    visitorInitPromise = initVisitor()
      .then(() => {
        hasInitializedVisitor = true
      })
      .catch((error) => {
        const status = error instanceof VisitorInitError ? error.status : null

        if (process.env.NODE_ENV !== 'production') {
          console.warn('[VisitorProvider] visitor init request failed', {
            pathname: pathnameRef.current,
            route: API_ROUTES.visitorInit,
            status,
            error: error instanceof Error ? error.message : String(error),
          })
        }

        if (
          process.env.NODE_ENV !== 'production' &&
          status === 404 &&
          !visitorInitRetryTimeout
        ) {
          visitorInitRetryTimeout = setTimeout(() => {
            visitorInitRetryTimeout = null
            visitorInitPromise = initVisitor()
              .then(() => {
                hasInitializedVisitor = true
              })
              .catch((retryError) => {
                const retryStatus =
                  retryError instanceof VisitorInitError ? retryError.status : null

                if (process.env.NODE_ENV !== 'production') {
                  console.warn('[VisitorProvider] visitor init retry failed', {
                    pathname: pathnameRef.current,
                    route: API_ROUTES.visitorInit,
                    status: retryStatus,
                    error:
                      retryError instanceof Error ? retryError.message : String(retryError),
                  })
                }
              })
              .finally(() => {
                visitorInitPromise = null
              })
          }, 500)
        }
      })
      .finally(() => {
        visitorInitPromise = null
      })
  }, [isAuthPage])

  return null
}
