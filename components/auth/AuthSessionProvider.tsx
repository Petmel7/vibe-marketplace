'use client'

import { createContext, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import type { SessionUser } from '@/types/auth'

type AuthSessionContextValue = {
  user: SessionUser | null
  isAuthenticated: boolean
  isRefreshing: boolean
  isHydrated: boolean
  setUser: (user: SessionUser | null) => void
  refreshUser: () => Promise<SessionUser | null>
}

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(null)

async function fetchCurrentUser(): Promise<SessionUser | null> {
  const response = await fetch(API_ROUTES.authMe, {
    credentials: 'include',
    cache: 'no-store',
  })

  if (response.status === 401) return null
  if (response.status === 404) throw new Error('AUTH_ROUTE_UNAVAILABLE')
  if (!response.ok) throw new Error('Failed to refresh auth session')

  const payload = (await response.json()) as
    | { success: true; data: SessionUser }
    | { success: false; error: { message: string; code: string } }

  return payload.success ? payload.data : null
}

export default function AuthSessionProvider({
  initialUser,
  children,
}: {
  initialUser: SessionUser | null
  children: ReactNode
}) {
  const pathname = usePathname()
  const [user, setUser] = useState<SessionUser | null>(initialUser)
  const [hydratedPathname, setHydratedPathname] = useState<string | null>(
    initialUser ? pathname : null
  )
  const [isRefreshing, startTransition] = useTransition()
  const inFlightPathRef = useRef<string | null>(null)
  const isHydrated = hydratedPathname === pathname

  useEffect(() => {
    if (hydratedPathname === pathname || inFlightPathRef.current === pathname) {
      return
    }

    let isCancelled = false
    inFlightPathRef.current = pathname

    startTransition(() => {
      fetchCurrentUser()
        .then((nextUser) => {
          if (isCancelled) return
          setUser(nextUser)
          setHydratedPathname(pathname)
        })
        .catch((error) => {
          if (isCancelled) return
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[AuthSessionProvider] unable to refresh current user', {
              pathname,
              error: error instanceof Error ? error.message : String(error),
            })
          }
          setHydratedPathname(pathname)
        })
        .finally(() => {
          if (!isCancelled && inFlightPathRef.current === pathname) {
            inFlightPathRef.current = null
          }
        })
    })

    return () => {
      isCancelled = true
    }
  }, [hydratedPathname, pathname])

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isRefreshing,
      isHydrated,
      setUser,
      refreshUser: () =>
        new Promise<SessionUser | null>((resolve, reject) => {
          if (inFlightPathRef.current === pathname) {
            resolve(user)
            return
          }

          inFlightPathRef.current = pathname
          startTransition(() => {
            fetchCurrentUser()
              .then((nextUser) => {
                setUser(nextUser)
                setHydratedPathname(pathname)
                resolve(nextUser)
              })
              .catch((error) => {
                if (process.env.NODE_ENV !== 'production') {
                  console.warn('[AuthSessionProvider] manual refresh failed', {
                    pathname,
                    error: error instanceof Error ? error.message : String(error),
                  })
                }
                reject(error)
              })
              .finally(() => {
                if (inFlightPathRef.current === pathname) {
                  inFlightPathRef.current = null
                }
              })
          })
        }),
    }),
    [isHydrated, isRefreshing, pathname, user]
  )

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}
