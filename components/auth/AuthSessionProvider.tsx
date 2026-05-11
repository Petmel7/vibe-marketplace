'use client'

import { createContext, useEffect, useMemo, useState, useTransition } from 'react'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
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
  const response = await fetch('/api/auth/me', {
    credentials: 'include',
    cache: 'no-store',
  })

  if (response.status === 401) return null
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
  const isHydrated = hydratedPathname === pathname

  useEffect(() => {
    let isCancelled = false

    startTransition(() => {
      fetchCurrentUser()
        .then((nextUser) => {
          if (isCancelled) return
          setUser(nextUser)
          setHydratedPathname(pathname)
        })
        .catch(() => {
          if (isCancelled) return
          setHydratedPathname(pathname)
        })
    })

    return () => {
      isCancelled = true
    }
  }, [pathname])

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isRefreshing,
      isHydrated,
      setUser,
      refreshUser: () =>
        new Promise<SessionUser | null>((resolve, reject) => {
          startTransition(() => {
            fetchCurrentUser()
              .then((nextUser) => {
                setUser(nextUser)
                setHydratedPathname(pathname)
                resolve(nextUser)
              })
              .catch(reject)
          })
        }),
    }),
    [isHydrated, isRefreshing, pathname, user]
  )

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}
