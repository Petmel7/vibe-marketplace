'use client'

import { useEffect, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { UserRole } from '@/types/roles'

type Options = {
  redirectTo?: string
  requiredRole?: UserRole
}

export function useRequireAuth(options: Options = {}) {
  const { user, isAuthenticated, isRefreshing } = useCurrentUser()
  const pathname = usePathname()
  const router = useRouter()

  const hasRequiredRole = useMemo(() => {
    if (!options.requiredRole) return true
    return user?.roles.includes(options.requiredRole) ?? false
  }, [options.requiredRole, user])

  useEffect(() => {
    if (isRefreshing || isAuthenticated) return

    const target = options.redirectTo ?? `/login?next=${encodeURIComponent(pathname || '/profile')}`
    router.replace(target)
  }, [isAuthenticated, isRefreshing, options.redirectTo, pathname, router])

  return {
    user,
    isAuthenticated,
    isRefreshing,
    hasRequiredRole,
    isAuthorized: isAuthenticated && hasRequiredRole,
  }
}
