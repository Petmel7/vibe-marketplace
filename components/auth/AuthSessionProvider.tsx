'use client'

import { createContext, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { API_ROUTES, isAuthPagePath } from '@/lib/constants/apiRoutes'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { useCartStore } from '@/store/cartStore'
import type { SessionUser } from '@/types/auth'

type AuthSessionContextValue = {
  user: SessionUser | null
  isAuthenticated: boolean
  isAuthLoading: boolean
  isRefreshing: boolean
  isSyncingUser: boolean
  isHydrated: boolean
  hasCompletedInitialSync: boolean
  setUser: (user: SessionUser | null) => void
  refreshUser: () => Promise<SessionUser | null>
}

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(null)

function shouldRefreshSessionForPathname(pathname: string | null) {
  if (!pathname) {
    return false
  }

  return !isAuthPagePath(pathname)
}

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

async function syncAuthenticatedUser(
  accessToken: string,
  guestSessionId?: string
): Promise<SessionUser> {
  const headers = new Headers({
    Authorization: `Bearer ${accessToken}`,
  })

  if (guestSessionId) {
    headers.set('x-session-id', guestSessionId)
  }

  const response = await fetch(API_ROUTES.authSync, {
    method: 'POST',
    headers,
    credentials: 'include',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Failed to sync authenticated session')
  }

  const payload = (await response.json()) as
    | { success: true; data: SessionUser }
    | { success: false; error: { message: string; code: string } }

  if (!payload.success) {
    throw new Error(payload.error.message)
  }

  return payload.data
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
  const [hasBootstrappedBrowserSession, setHasBootstrappedBrowserSession] = useState(
    Boolean(initialUser) || isAuthPagePath(pathname)
  )
  const [isSyncingUser, setIsSyncingUser] = useState(false)
  const [isRefreshing, startTransition] = useTransition()
  const inFlightPathRef = useRef<string | null>(null)
  const lastSyncedAccessTokenRef = useRef<string | null>(null)
  const syncingAccessTokenRef = useRef<string | null>(null)
  const isHydrated = !shouldRefreshSessionForPathname(pathname) || hydratedPathname === pathname

  useEffect(() => {
    if (!hasBootstrappedBrowserSession) {
      return
    }

    if (!shouldRefreshSessionForPathname(pathname)) {
      return
    }

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
              route: API_ROUTES.authMe,
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
  }, [hasBootstrappedBrowserSession, hydratedPathname, pathname])

  useEffect(() => {
    let cancelled = false
    let subscription: { unsubscribe: () => void } | null = null
    let supabase: ReturnType<typeof getSupabaseBrowser>

    async function syncSession(
      accessToken: string,
      options?: { force?: boolean; refreshCart?: boolean }
    ) {
      if (!options?.force && lastSyncedAccessTokenRef.current === accessToken) {
        return
      }

      if (syncingAccessTokenRef.current === accessToken) {
        return
      }

      const guestSessionId = useCartStore.getState().sessionId || undefined
      syncingAccessTokenRef.current = accessToken
      setIsSyncingUser(true)

      startTransition(() => {
        syncAuthenticatedUser(accessToken, guestSessionId)
          .then((nextUser) => {
            if (cancelled) {
              return
            }

            lastSyncedAccessTokenRef.current = accessToken
            setUser(nextUser)
            setHydratedPathname(pathname)
            setHasBootstrappedBrowserSession(true)

            if (options?.refreshCart) {
              useCartStore.getState().bumpRefreshKey()
            }
          })
          .catch((error) => {
            if (cancelled) {
              return
            }

            if (process.env.NODE_ENV !== 'production') {
              console.warn('[AuthSessionProvider] auth sync failed', {
                pathname,
                route: API_ROUTES.authSync,
                error: error instanceof Error ? error.message : String(error),
              })
            }

            fetchCurrentUser()
              .then((nextUser) => {
                if (cancelled) {
                  return
                }

                setUser(nextUser)
                setHydratedPathname(pathname)
                setHasBootstrappedBrowserSession(true)
              })
              .catch((refreshError) => {
                if (cancelled) {
                  return
                }

                if (process.env.NODE_ENV !== 'production') {
                  console.warn('[AuthSessionProvider] fallback current-user refresh failed', {
                    pathname,
                    route: API_ROUTES.authMe,
                    error:
                      refreshError instanceof Error
                        ? refreshError.message
                        : String(refreshError),
                  })
                }
                setHasBootstrappedBrowserSession(true)
              })
          })
          .finally(() => {
            if (syncingAccessTokenRef.current === accessToken) {
              syncingAccessTokenRef.current = null
            }
            if (!cancelled) {
              setIsSyncingUser(false)
            }
          })
      })
    }

    try {
      supabase = getSupabaseBrowser()
    } catch {
      return () => {
        cancelled = true
      }
    }

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) {
          return
        }

        if (!session?.access_token) {
          setIsSyncingUser(false)
          setUser(null)
          setHydratedPathname(pathname)
          setHasBootstrappedBrowserSession(true)
          return
        }

        void syncSession(session.access_token, {
          force: !initialUser,
          refreshCart: Boolean(useCartStore.getState().sessionId),
        })
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        if (process.env.NODE_ENV !== 'production') {
          console.warn('[AuthSessionProvider] browser session bootstrap failed', {
            pathname,
            error: error instanceof Error ? error.message : String(error),
          })
        }

        setIsSyncingUser(false)
        setHasBootstrappedBrowserSession(true)
      })

    subscription = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_OUT' || !session) && !cancelled) {
        lastSyncedAccessTokenRef.current = null
        setIsSyncingUser(false)
        setUser(null)
        setHydratedPathname(pathname)
        setHasBootstrappedBrowserSession(true)
        useCartStore.getState().bumpRefreshKey()
        return
      }

      if (
        session?.access_token &&
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')
      ) {
        void syncSession(session.access_token, {
          force: event === 'SIGNED_IN',
          refreshCart: event === 'SIGNED_IN',
        })
      }
    }).data.subscription

    return () => {
      cancelled = true
      subscription?.unsubscribe()
    }
  }, [initialUser, pathname])

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAuthLoading: !hasBootstrappedBrowserSession || isRefreshing || isSyncingUser,
      isRefreshing,
      isSyncingUser,
      isHydrated,
      hasCompletedInitialSync: hasBootstrappedBrowserSession,
      setUser,
      refreshUser: () =>
        new Promise<SessionUser | null>((resolve, reject) => {
          if (!shouldRefreshSessionForPathname(pathname)) {
            resolve(user)
            return
          }

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
                    route: API_ROUTES.authMe,
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
    [hasBootstrappedBrowserSession, isHydrated, isRefreshing, isSyncingUser, pathname, user]
  )

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}
